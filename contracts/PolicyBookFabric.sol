// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;

import "@openzeppelin/contracts/math/Math.sol";

import "./interfaces/IPolicyBookFabric.sol";
import "./interfaces/IPolicyBookRegistry.sol";

import "./ContractsRegistry.sol";
import "./PolicyBook.sol";

contract PolicyBookFabric is IPolicyBookFabric {
  using Math for uint256;

  ContractsRegistry public contractsRegistry;
  IPolicyBookRegistry public policyRegistry;
  
  address public daiAddr;

  event Created(address insured, ContractType contractType, address at);

  constructor(ContractsRegistry _contractsRegistry) {
    contractsRegistry = _contractsRegistry;
    policyRegistry = IPolicyBookRegistry(_contractsRegistry.getContract(_contractsRegistry.getPolicyBookRegistryName()));
    daiAddr = _contractsRegistry.getContract(_contractsRegistry.getDAIName());
  }

  function create(
    address _insuranceContract,
    ContractType _contractType,
    string memory _description,
    string memory _projectSymbol
  ) external override returns (address _policyBook) {
    PolicyBook _newPolicyBook = new PolicyBook(contractsRegistry, _insuranceContract, _contractType, _description, _projectSymbol);
    policyRegistry.add(_insuranceContract, address(_newPolicyBook));

    emit Created(_insuranceContract, _contractType, address(_newPolicyBook));

    return address(_newPolicyBook);
  }

  function policyBookFor(address _contract) external view override returns (address _policyBook) {
    return policyRegistry.policyBookFor(_contract);
  }

  function policyBooksCount() external view override returns (uint256 _policyBookCount) {
    return policyRegistry.count();
  }

  function policyBooks(uint256 _offset, uint256 _limit)
    external
    view
    override
    returns (uint256 _policyBooksCount, address[] memory _policyBooks)
  {
    return policyRegistry.list(_offset, _limit);
  }
}
