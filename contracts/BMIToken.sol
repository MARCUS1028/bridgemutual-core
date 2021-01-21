// SPDX-License-Identifier: MIT
pragma solidity =0.7.4;

import "./erc20permit/ERC20Permit.sol";

contract BMIToken is ERC20Permit {
  uint256 constant TOTAL_SUPPLY = 160 * (10**6) * (10**18);

  constructor(address vesting_address) ERC20Permit("BridgeMutual Insurance") ERC20("BridgeMutual Insurance", "BMI") {
    _mint(vesting_address, TOTAL_SUPPLY);
  }
}
