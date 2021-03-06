// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IPolicyBook.sol";
import "./interfaces/IPolicyBookRegistry.sol";

import "./ContractsRegistry.sol";

contract PolicyBookRegistry is IPolicyBookRegistry, Ownable {
  using Math for uint256;

  ContractsRegistry public contractsRegistry;

  address public policyBookFabricAddress;
  uint256 private policyBooksCount;

  address[] public policies;
  mapping(address => address) public policiesByAddress;

  event Added(address insured, address at);

  modifier onlyPolicyBookFabric() {
    require(msg.sender == policyBookFabricAddress, "Caller is not a PolicyBookFabric contract");
    _;
  }

  function initRegistry(ContractsRegistry _contractsRegistry) external onlyOwner {
    contractsRegistry = _contractsRegistry;

    policyBookFabricAddress = contractsRegistry.getContract(contractsRegistry.getPolicyBookFabricName());
  }

  function add(address _insuredContract, address _policyBook) external override onlyPolicyBookFabric {
    require(policiesByAddress[_insuredContract] == address(0), "PolicyBook for the contract is already created");

    policies.push(_policyBook);
    policiesByAddress[_insuredContract] = _policyBook;
    policyBooksCount++;

    emit Added(_insuredContract, _policyBook);
  }

  function count() external view override returns (uint256 _policyBooksCount) {
    return policyBooksCount;
  }

  function list(uint256 _offset, uint256 _limit)
    public
    view
    override
    returns (uint256 _policyBooksCount, address[] memory _policyBooks)
  {
    uint256 to = (_offset + _limit).min(policyBooksCount).max(_offset);
    uint256 size = to - _offset;

    address[] memory result = new address[](size);

    for (uint256 i = _offset; i < to; i++) {
      result[i - _offset] = policies[i];
    }

    return (size, result);
  }

  function listWithStats(uint256 _offset, uint256 _limit)
    public
    view
    override
    returns (
      uint256 _policyBooksCount, 
      address[] memory _policyBooks,
      string[] memory _names,
      address[] memory _insuredContracts,
      IPolicyBookFabric.ContractType[] memory _contractTypes,
      uint256[] memory _maxCapacities,
      uint256[] memory _totalDaiLiquidity,
      uint256[] memory _annualProfitYields      
    )
  {
    (_policyBooksCount,
    _policyBooks) = list(_offset, _limit);

    (_names, 
    _insuredContracts,
    _contractTypes,
    _maxCapacities,
    _totalDaiLiquidity,
    _annualProfitYields) = stats(_policyBooks);
  }

  function policyBookFor(address _contract) external view override returns (address _policyBook) {
    return policiesByAddress[_contract];
  }

  function stats(address[] memory _policyBooks)
    public
    view
    override
    returns (
      string[] memory _names,
      address[] memory _insuredContracts,
      IPolicyBookFabric.ContractType[] memory _contractTypes,
      uint256[] memory _maxCapacities,
      uint256[] memory _totalDaiLiquidity,
      uint256[] memory _annualProfitYields
    )
  {
    string[] memory names = new string[](_policyBooks.length);
    address[] memory insuredContracts = new address[](_policyBooks.length);
    IPolicyBookFabric.ContractType[] memory contractTypes = new IPolicyBookFabric.ContractType[](_policyBooks.length);
    uint256[] memory maxCapacities = new uint256[](_policyBooks.length);
    uint256[] memory totalDaiLiquidity = new uint256[](_policyBooks.length);
    uint256[] memory annualProfitYields = new uint256[](_policyBooks.length);

    // TODO APY
    for (uint256 i = 0; i < _policyBooks.length; i++) {      
      (names[i], 
      insuredContracts[i],
      contractTypes[i],
      maxCapacities[i],
      totalDaiLiquidity[i],
      annualProfitYields[i]) = IPolicyBook(_policyBooks[i]).stats();
    }

    return (names, insuredContracts, contractTypes, maxCapacities, totalDaiLiquidity, annualProfitYields);
  }

  function statsByInsuredContracts(address[] memory _insuredContracts)
    public
    view
    override
    returns (      
      string[] memory _names,
      IPolicyBookFabric.ContractType[] memory _contractTypes,
      uint256[] memory _maxCapacities,
      uint256[] memory _totalDaiLiquidity,
      uint256[] memory _annualProfitYields
    )
  {
    string[] memory names = new string[](_insuredContracts.length);    
    IPolicyBookFabric.ContractType[] memory contractTypes = 
      new IPolicyBookFabric.ContractType[](_insuredContracts.length);
    uint256[] memory maxCapacities = new uint256[](_insuredContracts.length);
    uint256[] memory totalDaiLiquidity = new uint256[](_insuredContracts.length);
    uint256[] memory annualProfitYields = new uint256[](_insuredContracts.length);  

    address nothing;

    // TODO APY
    for (uint256 i = 0; i < _insuredContracts.length; i++) {
      (names[i], 
      nothing, // does nothing, needed not to overcomplicate the method
      contractTypes[i],
      maxCapacities[i],
      totalDaiLiquidity[i],
      annualProfitYields[i]) = IPolicyBook(policiesByAddress[_insuredContracts[i]]).stats();
    }

    return (names, contractTypes, maxCapacities, totalDaiLiquidity, annualProfitYields);
  }
}
