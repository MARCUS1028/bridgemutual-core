// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "../tokens/ERC1155Ultra.sol";

contract ERC1155UltraMock is ERC1155Ultra {

    constructor() ERC1155Ultra("ERC1155Mock", "M1155") {}

    function mint(uint256 id, uint256 amount) public {
        _mint(_msgSender(), id, amount, "");
    }

    function mintBatch(uint256[] memory ids, uint256[] memory amounts) public {
        _mintBatch(_msgSender(), ids, amounts, "");
    }

    function burn(uint256 id, uint256 amount) public {
        _burn(_msgSender(), id, amount);
    }

    function burnBatch(uint256[] memory ids, uint256[] memory amounts) public {
        _burnBatch(_msgSender(), ids, amounts);
    }
}