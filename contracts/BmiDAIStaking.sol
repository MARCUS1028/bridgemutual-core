// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./PolicyBook.sol";

contract BmiDAIStaking is ERC721 {
    struct StakingInfo {
        uint256 stakingStartTime;        
        uint256 bmiDAIAmount;
        address policyBookAddress;
    }
    
    mapping(uint256 => StakingInfo) private _stakersPool; // NFT => INFO
    
    uint256 private _currentNFTMintID = 1;

    constructor() ERC721("BridgeMutual staking", "BMS") {
    }

    function mintNFT(
        address _staker,        
        uint256 _amount,
        address _policyBookAddress
    ) private {                
        uint256 stakerBalance = balanceOf(_staker);
        uint256 totalAmount = _amount;

        for (uint256 i = 0; i < stakerBalance; i++) {
            uint256 tokenIndex = tokenOfOwnerByIndex(_staker, i);            

            if (_stakersPool[tokenIndex].policyBookAddress == _policyBookAddress) {
                totalAmount += _stakersPool[tokenIndex].bmiDAIAmount;
                
                _burn(tokenIndex);
                delete _stakersPool[tokenIndex];
            }
        }

        _safeMint(_staker, _currentNFTMintID);
        _stakersPool[_currentNFTMintID] = StakingInfo(block.timestamp, totalAmount, _policyBookAddress); 

        _currentNFTMintID++;
    }    

    function stakeDAIx(uint256 _amount, address _policyBookAddress) external {
        require(
            _amount <= IERC20(_policyBookAddress).balanceOf(_msgSender()),
            "Insufficient funds"
        );        
       
        mintNFT(_msgSender(), _amount, _policyBookAddress);

        // transfer dai to yield generator
    }

    function withdrawProfit() external {
        // from the mock Yield Generator
    }
}
