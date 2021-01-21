// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "./interfaces/IPolicyBook.sol";

import "./tokens/CustomERC1155.sol";
import "./PolicyBook.sol";
import "./ContractsRegistry.sol";

contract BmiDAIStaking is CustomERC1155 {
    struct StakingInfo {
        uint256 stakingStartTime;        
        uint256 bmiDAIAmount;
        address policyBookAddress;
    }    

    ContractsRegistry public contractsRegistry;

    IERC20 daiToken;
    
    mapping(uint256 => StakingInfo) private _stakersPool; // NFT => INFO
    
    uint256 private _currentNFTMintID = 1;

    constructor(ContractsRegistry _contractsRegistry) CustomERC1155("") {
        contractsRegistry = _contractsRegistry;

        daiToken = IERC20(_contractsRegistry.getContract(_contractsRegistry.getDAIName()));
    }

    function _mintNFT(
        address _staker,        
        uint256 _amount,
        address _policyBookAddress
    ) private {                
        uint256 stakerBalance = balanceOfNFT(_staker);
        uint256 totalAmount = _amount;

        for (uint256 i = 0; i < stakerBalance; i++) {
            uint256 tokenIndex = tokenOfOwnerByIndexNFT(_staker, i);            

            if (_stakersPool[tokenIndex].policyBookAddress == _policyBookAddress) {
                totalAmount += _stakersPool[tokenIndex].bmiDAIAmount;
                
                _burn(_staker, tokenIndex, 1);
                delete _stakersPool[tokenIndex];
            }
        }

        _mint(_staker, _currentNFTMintID, 1, "");
        _stakersPool[_currentNFTMintID] = StakingInfo(block.timestamp, totalAmount, _policyBookAddress); 

        _currentNFTMintID++;
    }    

    function stakeDAIx(uint256 _amount, IPolicyBook _policyBook) external {
        require(
            _amount <= _policyBook.balanceOf(_msgSender()),
            "Insufficient funds"
        );        
       
        _mintNFT(_msgSender(), _amount, address(_policyBook));

        address yieldGeneratorAddress = contractsRegistry.getContract(contractsRegistry.getYieldGeneratorName());

        // transfer DAI from PolicyBook to yield generator
        bool success = daiToken.transferFrom(address(_policyBook), yieldGeneratorAddress, _amount);        
        require(success, "Failed to transfer DAI tokens");

        // transfer bmiDAIx from user to staking
        success = _policyBook.transferFrom(msg.sender, address(this), _amount);        
        require(success, "Failed to transfer bmiDAIx tokens");
    }

    function withdrawProfit() external {
        // from the mock Yield Generator
    }
}
