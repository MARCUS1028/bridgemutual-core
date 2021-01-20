// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ContractsRegistry is Ownable, AccessControl{
    mapping (bytes32 => address) private contracts;

    bytes32 public constant NEW_CONTRACTS_ADDER_ROLE = keccak256("NEW_CONTRACTS_ADDER_ROLE");

    modifier onlyAdder() {
        require(hasRole(NEW_CONTRACTS_ADDER_ROLE, msg.sender), "Caller is not an adder");
        _;
    }

    constructor() {
        _setupRole(NEW_CONTRACTS_ADDER_ROLE, owner());        
        _setRoleAdmin(NEW_CONTRACTS_ADDER_ROLE, NEW_CONTRACTS_ADDER_ROLE);
    }

    function addContractRegistry(string memory ) public onlyAdder {

    }
}