// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ContractsRegistry is Ownable, AccessControl {
    mapping (bytes32 => address) private _contracts;

    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");

    string constant private POLICY_BOOK_REGISTRY_NAME = "REGISTRY";  
    string constant private POLICY_BOOK_FABRIC_NAME = "FABRIC";        
    string constant private BMI_DAI_STAKING_NAME = "STAKING";
    string constant private YIELD_GENERATOR_NAME = "YIELD_GENERATOR";
    string constant private DAI_NAME = "DAI";
    string constant private BMI_NAME = "BMI";

    modifier onlyAdmin() {
        require(hasRole(REGISTRY_ADMIN_ROLE, msg.sender), "ContractsRegistry: Caller is not an admin");
        _;
    }

    constructor() {
        _setupRole(REGISTRY_ADMIN_ROLE, owner());        
        _setRoleAdmin(REGISTRY_ADMIN_ROLE, REGISTRY_ADMIN_ROLE);
    }

    function getDAIName() external pure returns (string memory) {
        return DAI_NAME;
    }

    function getBMIName() external pure returns (string memory) {
        return BMI_NAME;
    }

    function getPolicyBookRegistryName() external pure returns (string memory) {
        return POLICY_BOOK_REGISTRY_NAME;
    }

    function getPolicyBookFabricName() external pure returns (string memory) {
        return POLICY_BOOK_FABRIC_NAME;
    }

    function getBmiDAIStakingName() external pure returns (string memory) {
        return BMI_DAI_STAKING_NAME;
    }

    function getYieldGeneratorName() external pure returns (string memory) {
        return YIELD_GENERATOR_NAME;
    }

    function getContract(string memory _name) public view returns (address) {
        bytes32 bytesName = keccak256(abi.encodePacked(_name));

        require(_contracts[bytesName] != address(0), "ContractsRegistry: This mapping doesn't exist");

        return _contracts[bytesName];
    }

    function addContractRegistry(string memory _name, address _contractAddress) public onlyAdmin {
        require(_contractAddress != address(0), "ContractsRegistry: Null address is forbidden");        

        bytes32 bytesName = keccak256(abi.encodePacked(_name));
        _contracts[bytesName] = _contractAddress;
    }

    function modifyContractRegistry(string memory _name, address _contractAddress) public onlyAdmin {
        require(_contractAddress != address(0), "ContractsRegistry: Null address is forbidden");        

        bytes32 bytesName = keccak256(abi.encodePacked(_name));

        require(_contracts[bytesName] != address(0), "ContractsRegistry: This mapping doesn't exist");

        _contracts[bytesName] = _contractAddress;
    }

    function deleteContractRegistry(string memory _name) public onlyAdmin {
        bytes32 bytesName = keccak256(abi.encodePacked(_name));

        require(_contracts[bytesName] != address(0), "ContractsRegistry: This mapping doesn't exist");

        delete _contracts[bytesName];
    }    
}