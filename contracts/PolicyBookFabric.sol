// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;

import "@openzeppelin/contracts/math/Math.sol";

import "./interfaces/IPolicyBookFabric.sol";
import "./interfaces/IPolicyBookRegistry.sol";
import "./PolicyBook.sol";

contract PolicyBookFabric is IPolicyBookFabric {
  using Math for uint256;

  IPolicyBookRegistry public registry;
  address public daiAddr;

  event Created(address insured, ContractType contractType, address at);

  constructor(IPolicyBookRegistry _registry, address _daiAddr) {
    registry = _registry;
    daiAddr = _daiAddr;
  }

  function create(address _contract, ContractType _contractType) external override returns (address _policyBook) {
    PolicyBook _newPolicyBook = new PolicyBook(_contract, _contractType, daiAddr);
    registry.add(_contract, address(_newPolicyBook));

    emit Created(_contract, _contractType, address(_newPolicyBook));

    return address(_newPolicyBook);
  }

  function policyBookFor(address _contract) external view override returns (address _policyBook) {
    return registry.policyBookFor(_contract);
  }

  function policyBooksCount() external view override returns (uint256 _policyBookCount) {
    return registry.count();
  }

  function policyBooks(uint256 _offset, uint256 _limit)
    external
    view
    override
    returns (uint256 _policyBooksCount, address[] memory _policyBooks)
  {
    return registry.list(_offset, _limit);
  }
}
