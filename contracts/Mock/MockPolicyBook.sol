// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "../PolicyBook.sol";

contract MockPolicyBook is PolicyBook {
  constructor(address _contract, IPolicyBookFabric.ContractType _contractType, address _daiAddr, address _liquidityMiningAddr)
    PolicyBook(_contract, _contractType, _daiAddr, _liquidityMiningAddr, "", "") {}

  function setTotalLiquidity(uint256 _daiInThePoolTotal) public {
    totalLiquidity = _daiInThePoolTotal;
  }

  function setTotalCoverTokens(uint256 _daiInThePoolBought) public {
    totalCoverTokens = _daiInThePoolBought;
  }
}
