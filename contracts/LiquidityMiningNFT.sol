// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract LiquidityMiningNFT  is ERC1155 {
    uint256 private constant nftTypesCount = 4;
    uint256 private constant leaderboardSize = 10;

    constructor (string memory _uri) ERC1155(_uri) {}

    function mintNFTsForLM(address _liquidiyMiningAddr) external {
        uint256[] memory _ids = new uint256[](nftTypesCount);
        uint256[] memory _amounts = new uint256[](nftTypesCount);

        for(uint256 i = 1; i <= nftTypesCount; i++) {
            _ids[i - 1] = i;
            _amounts[i - 1] = i * leaderboardSize; 
        }

        _mintBatch(_liquidiyMiningAddr, _ids, _amounts, "");
    }
}