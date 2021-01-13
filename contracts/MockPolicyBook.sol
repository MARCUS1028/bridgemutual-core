// SPDX-License-Identifier: MIT
pragma solidity =0.7.4;
pragma experimental ABIEncoderV2;

import "./PolicyBook.sol";

contract MockPolicyBook is PolicyBook {
  constructor(address _contract, IPolicyBookFabric.ContractType _contractType) PolicyBook(_contract, _contractType) {}

  function setPoolDaiTotal(uint256 _daiInThePoolTotal) public {
    daiInThePoolTotal = _daiInThePoolTotal;
  }

  function setPoolDaiBought(uint256 _daiInThePoolBought) public {
    daiInThePoolBought = _daiInThePoolBought;
  }
}
