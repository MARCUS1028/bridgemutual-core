// SPDX-License-Identifier: MIT
pragma solidity =0.7.4;

import "./interfaces/IPolicyBook.sol";
import "./interfaces/IPolicyBookRegistry.sol";

contract PolicyBookRegistry {
  address policyFabricAddress;
  uint256 policyBooksCount;

  constructor(address _policyFabricAddress) {
    policyFabricAddress = _policyFabricAddress;
  }

  mapping(address => address) policies;

  modifier onlyPolicyFabric() {
    require(msg.sender == policyFabricAddress, "Caller is not a policyFabric contract");
    _;
  }

  function add(address _insuredContract, address _policyBook) external onlyPolicyFabric() {
    require(policies[_insuredContract] == address(0), "PolicyBook for the contract is already created");

    policies[_insuredContract] = _policyBook;
    policyBooksCount++;
  }

  function stats(address[] calldata _policyBooks)
    external
    returns (
      uint256[] memory _yearlyCost,
      uint256[] memory _maxCapacities,
      uint256[] memory _totalDaiLiquidity,
      uint256[] memory _annualProfitYields
    )
  {
    for (uint256 i = 0; i < _policyBooks.length; i++) {
      // to implement in policyBool
      // _yearlyCost[i] = IPolicyBook(_policyBooks[i]).yearlyCost();
      // _maxCapacities[i] = IPolicyBook(_policyBooks[i]).maxCapacities();
      // _totalDaiLiquidity[i] = IPolicyBook(_policyBooks[i]).totalLiquidityDAI();
      // _annualProfitYields[i] = IPolicyBook(_policyBooks[i]).annualProfitYields();
    }
  }

  function statsByInsuredContracts(address[] calldata _insuredContracts)
    external
    returns (
      uint256[] memory _yearlyCost,
      uint256[] memory _maxCapacities,
      uint256[] memory _totalDaiLiquidity,
      uint256[] memory _annualProfitYields
    )
  {
    for (uint256 i = 0; i < _insuredContracts.length; i++) {
      // to implement in policyBool
      // _yearlyCost[i] = IPolicyBook(policies[_insuredContracts[i]]).yearlyCost();
      // _maxCapacities[i] = IPolicyBook(policies[_insuredContracts[i]]).maxCapacities();
      // _totalDaiLiquidity[i] = IPolicyBook(policies[_insuredContracts[i]]).totalLiquidityDAI();
      // _annualProfitYields[i] = IPolicyBook(policies[_insuredContracts[i]]).annualProfitYields();
    }
  }
}
