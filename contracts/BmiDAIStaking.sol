// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "./tokens/CustomERC1155.sol";
import "./PolicyBook.sol";

contract BmiDAIStaking is CustomERC1155 {
    struct StakingInfo {
        uint256 stakingStartTime;        
        uint256 bmiDAIAmount;
        address policyBookAddress;
    }
    
    mapping(uint256 => StakingInfo) private _stakersPool; // NFT => INFO
    
    uint256 private _currentNFTMintID = 1;

    constructor() CustomERC1155("") {
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

    function stakeDAIx(uint256 _amount, address _policyBookAddress) external {
        require(
            _amount <= IERC20(_policyBookAddress).balanceOf(_msgSender()),
            "Insufficient funds"
        );        
       
        _mintNFT(_msgSender(), _amount, _policyBookAddress);

        // transfer dai to yield generator
    }

    function withdrawProfit() external {
        // from the mock Yield Generator
    }
}
