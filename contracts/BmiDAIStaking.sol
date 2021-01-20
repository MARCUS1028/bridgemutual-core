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
    
    mapping(uint256 => StakingInfo) stakersPool; // NFT => INFO
    
    uint256 currentNFTMintID = 1;

    constructor() ERC721("BridgeMutual staking", "BMS") {
    }

    function mintNFT(
        address staker,        
        uint256 amount,
        address policyBookAddress
    ) private {                
        uint256 stakerBalance = balanceOf(staker);
        uint256 totalAmount = amount;

        for (uint256 i = 0; i < stakerBalance; i++) {
            uint256 tokenIndex = tokenOfOwnerByIndex(staker, i);            

            if (stakersPool[tokenIndex].policyBookAddress == policyBookAddress) {
                totalAmount += stakersPool[tokenIndex].bmiDAIAmount;
                
                _burn(tokenIndex);
                delete stakersPool[tokenIndex];
            }
        }

        _safeMint(staker, currentNFTMintID);
        stakersPool[currentNFTMintID] = StakingInfo(block.timestamp, totalAmount, policyBookAddress); 

        currentNFTMintID++;
    }    

    function stakeDAIx(uint256 amount, PolicyBook policyBook) external {
        require(
            amount <= policyBook.balanceOf(_msgSender()),
            "Insufficient funds"
        );        
       
        mintNFT(_msgSender(), amount, address(policyBook));

        // transfer dai to yield generator
    }

    function withdrawProfit() external {
        // from the mock Yield Generator
    }
}
