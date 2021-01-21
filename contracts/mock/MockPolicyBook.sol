// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "../PolicyBook.sol";

contract MockPolicyBook is PolicyBook {
  constructor(ContractsRegistry _contractsRegistry, address _insuranceContract, IPolicyBookFabric.ContractType _contractType)
    PolicyBook(_contractsRegistry, _insuranceContract, _contractType, "", "") {}

  function setTotalLiquidity(uint256 _daiInThePoolTotal) public {
    totalLiquidity = _daiInThePoolTotal;
  }

  function setTotalCoverTokens(uint256 _daiInThePoolBought) public {
    totalCoverTokens = _daiInThePoolBought;
  }
}
