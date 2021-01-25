// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract LiquidityMiningNFT  is ERC1155 {
    constructor (string memory _uri) ERC1155(_uri) {}

    function mintNFTsForLM(address _liquidiyMiningAddr) external {
        uint256[] memory _ids = new uint256[](4);
        uint256[] memory _amounts = new uint256[](4);

        for(uint256 i = 1; i <= 4; i++) {
            _ids[i - 1] = i;
            _amounts[i - 1] = i * 10; 
        }

        _mintBatch(_liquidiyMiningAddr, _ids, _amounts, "");
    }
}