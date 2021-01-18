// SPDX-License-Identifier: MIT
pragma solidity =0.7.4;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IPolicyBook.sol";
import "./interfaces/IPolicyBookRegistry.sol";

contract PolicyBookRegistry is IPolicyBookRegistry, Ownable {
  using Math for uint256;

  address public policyFabricAddress;
  uint256 private policyBooksCount;

  address[] public policies;
  mapping(address => address) public policiesByAddress;

  event Added(address insured, address at);

  modifier onlyPolicyFabric() {
    require(msg.sender == policyFabricAddress, "Caller is not a policyFabric contract");
    _;
  }

  function setPolicyFabricAddress(address _policyFabricAddress) external onlyOwner {
    policyFabricAddress = _policyFabricAddress;
  }

  function add(address _insuredContract, address _policyBook) external override onlyPolicyFabric() {
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
    external
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

  function policyBookFor(address _contract) external view override returns (address _policyBook) {
    return policiesByAddress[_contract];
  }

  function stats(address[] calldata _policyBooks)
    external
    override
    returns (
      uint256[] memory _yearlyCost,
      uint256[] memory _maxCapacities,
      uint256[] memory _totalDaiLiquidity,
      uint256[] memory _annualProfitYields
    )
  {
    for (uint256 i = 0; i < _policyBooks.length; i++) {
      // to implement in policyBool
      // _yearlyCost[i] = IPolicyBook(_policyBooks[i]).yearlyCost();
      // _maxCapacities[i] = IPolicyBook(_policyBooks[i]).maxCapacities();
      // _totalDaiLiquidity[i] = IPolicyBook(_policyBooks[i]).totalLiquidityDAI();
      // _annualProfitYields[i] = IPolicyBook(_policyBooks[i]).annualProfitYields();
    }
  }

  function statsByInsuredContracts(address[] calldata _insuredContracts)
    external
    override
    returns (
      uint256[] memory _yearlyCost,
      uint256[] memory _maxCapacities,
      uint256[] memory _totalDaiLiquidity,
      uint256[] memory _annualProfitYields
    )
  {
    for (uint256 i = 0; i < _insuredContracts.length; i++) {
      // to implement in policyBool
      // _yearlyCost[i] = IPolicyBook(policies[_insuredContracts[i]]).yearlyCost();
      // _maxCapacities[i] = IPolicyBook(policies[_insuredContracts[i]]).maxCapacities();
      // _totalDaiLiquidity[i] = IPolicyBook(policies[_insuredContracts[i]]).totalLiquidityDAI();
      // _annualProfitYields[i] = IPolicyBook(policies[_insuredContracts[i]]).annualProfitYields();
    }
  }
}
