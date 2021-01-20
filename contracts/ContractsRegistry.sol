// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ContractsRegistry is Ownable, AccessControl{
    mapping (bytes32 => address) private _contracts;

    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");

    modifier onlyAdder() {
        require(hasRole(REGISTRY_ADMIN_ROLE, msg.sender), "Caller is not an adder");
        _;
    }

    constructor() {
        _setupRole(REGISTRY_ADMIN_ROLE, owner());        
        _setRoleAdmin(REGISTRY_ADMIN_ROLE, REGISTRY_ADMIN_ROLE);
    }

    function getContract(string memory _name) public view returns (address) {
        bytes32 bytesName = keccak256(abi.encodePacked(_name));

        require(_contracts[bytesName] != address(0), "This mapping doesn't exist");

        return _contracts[bytesName];
    }

    function addContractRegistry(string memory _name, address _contractAddress) public onlyAdder {
        require(_contractAddress != address(0), "Null address is forbidden");        

        bytes32 bytesName = keccak256(abi.encodePacked(_name));

        require(_contracts[bytesName] == address(0), "This mapping already exists");

        _contracts[bytesName] = _contractAddress;
    }

    function modifyContractRegistry(string memory _name, address _contractAddress) public onlyAdder {
        require(_contractAddress != address(0), "Null address is forbidden");        

        bytes32 bytesName = keccak256(abi.encodePacked(_name));

        require(_contracts[bytesName] != address(0), "This mapping doesn't exist");

        _contracts[bytesName] = _contractAddress;
    }

    function deleteContractRegistry(string memory _name) public onlyAdder {
        bytes32 bytesName = keccak256(abi.encodePacked(_name));

        require(_contracts[bytesName] != address(0), "This mapping doesn't exist");

        delete _contracts[bytesName];
    }
}