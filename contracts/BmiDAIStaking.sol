// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IBmiDaiStaking.sol";
import "./interfaces/IPolicyBook.sol";

import "./tokens/ERC1155.sol";
import "./PolicyBook.sol";
import "./ContractsRegistry.sol";
import "./DefiYieldGenerator.sol";

contract BmiDAIStaking is IBmiDaiStaking, ERC1155, Ownable {     
    uint256 constant private THREE_MONTH = 3 * 30 days;
    
    ContractsRegistry public contractsRegistry;

    IERC20 public daiToken;
    IERC20 public bmiToken;
    DefiYieldGenerator public defiYieldGenerator;
    
    mapping(uint256 => StakingInfo) private _stakersPool; // NFT => INFO
    
    uint256 private _currentNFTMintID = 1;

    event NFTMinted(uint256 id, address to);

    modifier onlyDefiYieldGenerator() {
        require (_msgSender() == address(defiYieldGenerator), "Only generator is allowed to increase profit");
        _;
    }

    constructor() ERC1155("") {}

    function initRegistry(ContractsRegistry _contractsRegistry) external onlyOwner {
        contractsRegistry = _contractsRegistry;

        daiToken = IERC20(_contractsRegistry.getContract(_contractsRegistry.getDAIName()));
        bmiToken = IERC20(_contractsRegistry.getContract(_contractsRegistry.getBMIName()));
        defiYieldGenerator = DefiYieldGenerator(contractsRegistry.getContract(contractsRegistry.getYieldGeneratorName()));
    }

    function _mintNFT(
        address _staker,        
        uint256 _amount,
        address _policyBookAddress
    ) private {                
        uint256 stakerBalance = balanceOfNFT(_staker);
        uint256 totalAmount = _amount;

        for (uint256 i = 0; i < stakerBalance; i++) {
            uint256 tokenID = tokenOfOwnerByIndexNFT(_staker, i);            

            if (_stakersPool[tokenID].policyBookAddress == _policyBookAddress) {
                totalAmount += _stakersPool[tokenID].stakedDaiAmount;
                
                _burn(_staker, tokenID, 1);
                delete _stakersPool[tokenID];
            }
        }

        _mint(_staker, _currentNFTMintID, 1, "");
        _stakersPool[_currentNFTMintID] = StakingInfo(block.timestamp, totalAmount, _policyBookAddress); 

        emit NFTMinted(_currentNFTMintID, _staker);

        _currentNFTMintID++;
    }    

    function stakeDAIx(uint256 _amount, IPolicyBook _policyBook) external override {
        require(
            _amount <= _policyBook.balanceOf(_msgSender()),
            "Insufficient funds"
        );                    

        // transfer DAI from PolicyBook to yield generator
        bool success = daiToken.transferFrom(address(_policyBook), address(defiYieldGenerator), _amount);        
        require(success, "Failed to transfer DAI tokens");

        // transfer bmiDAIx from user to staking
        success = _policyBook.transferFrom(_msgSender(), address(this), _amount);        
        require(success, "Failed to transfer bmiDAIx tokens");

        _mintNFT(_msgSender(), _amount, address(_policyBook));
    }

    function withdrawBMIProfit(uint256 tokenID) external override {
        require (ownerOfNFT(tokenID) == _msgSender(), "Not an NFT token owner");

        // transfer bmi profit from YieldGenerator to user
        bool success = bmiToken.transferFrom(address(defiYieldGenerator), _msgSender(), defiYieldGenerator.getProfit(tokenID));
        require(success, "Failed to transfer BMI tokens");
    }

    function withdrawFundsWithProfit(uint256 tokenID) external override {
        require (block.timestamp > _stakersPool[tokenID].stakingStartTime + THREE_MONTH, "Funds are locked for 3 month");
        require (ownerOfNFT(tokenID) == _msgSender(), "Not an NFT token owner");
       
        IBmiDaiStaking.StakingInfo memory stakingInfo = _stakersPool[tokenID];

        // transfer bmi profit from YieldGenerator to user
        bool success = bmiToken.transferFrom(address(defiYieldGenerator), _msgSender(), defiYieldGenerator.getProfit(tokenID));
        require(success, "Failed to transfer BMI tokens");

        // transfer DAI from YieldGenerator to PolicyBook
        success = daiToken.transferFrom(address(defiYieldGenerator), stakingInfo.policyBookAddress, stakingInfo.stakedDaiAmount);
        require(success, "Failed to transfer DAI tokens");   

        // transfer bmiDAIx from staking to the user
        success = IERC20(stakingInfo.policyBookAddress).transfer(_msgSender(), stakingInfo.stakedDaiAmount);
        require(success, "Failed to transfer bmiDAIx tokens");

        _burn(_msgSender(), tokenID, 1);
        delete _stakersPool[tokenID];
    }   

    function getStakingInfoByTokenID(uint256 tokenID) external view override returns (IBmiDaiStaking.StakingInfo memory _stakingInfo) {
        require (_existsNFT(tokenID), "NFT with such ID doesn't exist");

        return _stakersPool[tokenID];
    }
}
