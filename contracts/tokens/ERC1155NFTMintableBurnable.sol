// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./ERC1155.sol";

contract ERC1155NFTMintableBurnable is ERC1155, Ownable {
    constructor (string memory name_, string memory symbol_) ERC1155(name_, symbol_) {}

    function mintNFT(address account, uint256 id, uint256 amount, bytes memory data) external onlyOwner {
        _mint(account, id, amount, data);
    }

    function burnNFT(address account, uint256 id, uint256 amount) external onlyOwner {
        _burn(account, id, amount);
    }
}