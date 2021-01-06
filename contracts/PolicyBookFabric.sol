// SPDX-License-Identifier: MIT
pragma solidity =0.7.4;

import "@openzeppelin/contracts/math/Math.sol";

import "./interfaces/IPolicyBookFabric.sol";
import "./PolicyBook.sol";

contract PolicyBookFabric is IPolicyBookFabric {
  using Math for uint256;

  PolicyBook[] private books;
  mapping(address => PolicyBook) private booksByAddress;
  uint256 private booksCount;

  event Created(address insured, ContractType contractType, address at);

  function create(address _contract, ContractType _contractType) external override returns (address _policyBook) {
    require(booksByAddress[_contract] == PolicyBook(0), "Address already used");

    PolicyBook _newPolicyBook = new PolicyBook(_contract, _contractType);
    books.push(_newPolicyBook);
    booksByAddress[_contract] = _newPolicyBook;
    booksCount++;

    emit Created(_contract, _contractType, address(_newPolicyBook));

    return address(_newPolicyBook);
  }

  function policyBookFor(address _contract) external view override returns (address _policyBook) {
    return address(booksByAddress[_contract]);
  }

  function policyBooksCount() external view override returns (uint256 _policyBookCount) {
    return booksCount;
  }

  function policyBooks(uint256 _offset, uint256 _limit)
    external
    view
    override
    returns (uint256 _policyBooksCount, address[] memory _policyBooks)
  {
    uint256 to = (_offset + _limit).min(booksCount).max(_offset);
    uint256 size = to - _offset;
    address[] memory result = new address[](size);
    for (uint256 i = _offset; i < to; i++) {
      result[i - _offset] = address(books[i]);
    }

    return (size, result);
  }
}
