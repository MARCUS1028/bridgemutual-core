// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./PolicyBook.sol";
import "./ContractsRegistry.sol";
import "./DefiYieldGenerator.sol";

contract BMIDAIStaking is Ownable {
    struct StakingInfo {
        uint256 stakingStartTime;
        uint256 stakedDaiAmount;
        PolicyBook policyBook;
    }

    using EnumerableSet for EnumerableSet.UintSet;

    uint256 constant private THREE_MONTH = 3 * 30 days;
    
    ContractsRegistry public contractsRegistry;

    IERC20 public daiToken;
    IERC20 public bmiToken;
    DefiYieldGenerator public defiYieldGenerator;
    
    mapping (address => EnumerableSet.UintSet) private _holderTokens;
    mapping(uint256 => StakingInfo) private _stakersPool; // NFT => INFO
    
    /// @dev cruсial to start from 2
    uint256 private _currentNFTMintID = 2; 

    event StakingNFTMinted(uint256 id, address policyBookAddress, address to);
    event StakingNFTBurned(uint256 id, address policyBookAddress);
    event StakingBMIProfitWithdrawn(uint256 id, uint256 amount, address to);
    event StakingFundsWithdrawn(uint256 id, address to);

    function initRegistry(ContractsRegistry _contractsRegistry) external onlyOwner {
        contractsRegistry = _contractsRegistry;

        daiToken = IERC20(_contractsRegistry.getContract(_contractsRegistry.getDAIName()));
        bmiToken = IERC20(_contractsRegistry.getContract(_contractsRegistry.getBMIName()));
        defiYieldGenerator = 
            DefiYieldGenerator(contractsRegistry.getContract(contractsRegistry.getYieldGeneratorName()));
    }

    function makeDefiYieldGeneratorApproveStakingWithdrowal() external onlyOwner {
        defiYieldGenerator.approveAllDAITokensForStakingWithdrowal();
        defiYieldGenerator.approveAllBMITokensForStakingWithdrowal();
    }

    function _mintNFT(
        address _staker,        
        uint256 _amount,
        PolicyBook _policyBook
    ) private {             
        uint256 stakerBalance = _policyBook.balanceOfNFT(_staker);
        uint256 totalAmount = _amount;

        for (uint256 i = 0; i < stakerBalance; i++) {
            uint256 tokenID = _policyBook.tokenOfOwnerByIndexNFT(_staker, i);            
            
            totalAmount += _stakersPool[tokenID].stakedDaiAmount;
                
            _policyBook.burnNFT(_staker, tokenID, 1);

            emit StakingNFTBurned(tokenID, address(_policyBook));

            _holderTokens[_staker].remove(tokenID);
            delete _stakersPool[tokenID];
        }

        _policyBook.mintNFT(_staker, _currentNFTMintID, 1, "");

        _stakersPool[_currentNFTMintID] = StakingInfo(block.timestamp, totalAmount, _policyBook);
        _holderTokens[_staker].add(_currentNFTMintID);

        emit StakingNFTMinted(_currentNFTMintID, address(_policyBook), _staker);

        _currentNFTMintID++;
    }    

    function stakeDAIx(uint256 _amount, PolicyBook _policyBook) external {
        // transfer DAI from PolicyBook to yield generator
        bool success = daiToken.transferFrom(address(_policyBook), address(defiYieldGenerator), _amount);        
        require(success, "Staking: Failed to transfer DAI tokens");

        // transfer bmiDAIx from user to staking
        success = _policyBook.transferFrom(_msgSender(), address(this), _amount);        
        require(success, "Staking: Failed to transfer bmiDAIx tokens");

        _mintNFT(_msgSender(), _amount, _policyBook);
    }

    function withdrawBMIProfit(uint256 _tokenID) external {
        require(_stakersPool[_tokenID].stakingStartTime != 0, 
            "Staking: this staking token doesn't exist");
        require (_stakersPool[_tokenID].policyBook.ownerOfNFT(_tokenID) == _msgSender(), 
            "Staking: Not an NFT token owner");

        uint256 profit = defiYieldGenerator.getProfit(
            _stakersPool[_tokenID].stakingStartTime, 
            _stakersPool[_tokenID].stakedDaiAmount
        );

        // transfer bmi profit from YieldGenerator to user
        bool success = bmiToken.transferFrom(address(defiYieldGenerator), _msgSender(), profit);
        require(success, "Staking: Failed to transfer BMI tokens");

        emit StakingBMIProfitWithdrawn(_tokenID, profit, _msgSender());
    }

    function withdrawFundsWithProfit(uint256 _tokenID) external {
        require(_stakersPool[_tokenID].stakingStartTime != 0, "Staking: this staking token doesn't exist");
        require (block.timestamp > _stakersPool[_tokenID].stakingStartTime + THREE_MONTH, 
            "Staking: Funds are locked for 3 month");        
        require (_stakersPool[_tokenID].policyBook.ownerOfNFT(_tokenID) == _msgSender(), 
            "Staking: Not an NFT token owner");
       
        StakingInfo memory stakingInfo = _stakersPool[_tokenID];

        uint256 profit = defiYieldGenerator.getProfit(
            _stakersPool[_tokenID].stakingStartTime,
            _stakersPool[_tokenID].stakedDaiAmount
        );

        // transfer bmi profit from YieldGenerator to the user
        bool success = bmiToken.transferFrom(address(defiYieldGenerator), _msgSender(), profit);
        require(success, "Staking: Failed to transfer BMI tokens");

        emit StakingBMIProfitWithdrawn(_tokenID, profit, _msgSender());

        // transfer DAI from YieldGenerator to PolicyBook
        success = daiToken.transferFrom(
            address(defiYieldGenerator), 
            address(stakingInfo.policyBook), 
            stakingInfo.stakedDaiAmount
        );
        require(success, "Staking: Failed to transfer DAI tokens");   

        // transfer bmiDAIx from staking to the user
        success = stakingInfo.policyBook.transfer(_msgSender(), stakingInfo.stakedDaiAmount);
        require(success, "Staking: Failed to transfer bmiDAIx tokens");

        emit StakingFundsWithdrawn(_tokenID, _msgSender());

        _stakersPool[_tokenID].policyBook.burnNFT(_msgSender(), _tokenID, 1);

        _holderTokens[_msgSender()].remove(_tokenID);

        emit StakingNFTBurned(_tokenID, address(_stakersPool[_tokenID].policyBook));

        delete _stakersPool[_tokenID];        
    }       

    function stakingInfoByToken(uint256 _tokenID) public view returns (StakingInfo memory) {
        require(_stakersPool[_tokenID].stakingStartTime != 0, "Staking: this staking token doesn't exist");

        return _stakersPool[_tokenID];
    }

    function howManyStakings(address _owner) public view returns (uint256) {
        require(_owner != address(0), "Staking: balance query for the zero address");

        return _holderTokens[_owner].length();
    }

    function getStakingTokensByOwner(address _owner) public view returns (uint256[] memory) {
        uint256 size = howManyStakings(_owner);
        
        uint256[] memory tokens = new uint256[](size);

        for (uint256 i = 0; i < size; i++)
        {
            tokens[i] = _holderTokens[_owner].at(i);
        }

        return tokens;          
    }
}
