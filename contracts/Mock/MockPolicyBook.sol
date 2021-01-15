// SPDX-License-Identifier: MIT
pragma solidity =0.7.4;
pragma experimental ABIEncoderV2;

import "../PolicyBook.sol";

contract MockPolicyBook is PolicyBook {
  constructor(address _contract, IPolicyBookFabric.ContractType _contractType, address _daiAddr)
    PolicyBook(_contract, _contractType, _daiAddr) {}

  function setPoolDaiTotal(uint256 _daiInThePoolTotal) public {
    daiInThePoolTotal = _daiInThePoolTotal;
  }

  function setPoolDaiBought(uint256 _daiInThePoolBought) public {
    daiInThePoolBought = _daiInThePoolBought;
  }
}
