// SPDX-License-Identifier: MIT
pragma solidity =0.7.4;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


contract BMIToken is Initializable, ERC20Upgradeable, OwnableUpgradeable {
  uint256 constant TOTAL_SUPPLY = 160 * (10**6) * (10**18);

  function initialize(address tokenReceiver) public initializer {
    __ERC20_init("BridgeMutual Insurance", "BMI");
    __Ownable_init();
    _mint(tokenReceiver, TOTAL_SUPPLY);
  }
}
