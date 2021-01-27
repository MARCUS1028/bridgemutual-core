// SPDX-License-Identifier: MIT
pragma solidity =0.7.4;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract BMIToken is Initializable, ERC20Upgradeable {
  uint256 constant TOTAL_SUPPLY = 160 * (10**6) * (10**18);

  function initialize(address vesting_address) public initializer {
    __ERC20_init("BridgeMutual Insurance", "BMI");
    _mint(vesting_address, TOTAL_SUPPLY);
  }
}
