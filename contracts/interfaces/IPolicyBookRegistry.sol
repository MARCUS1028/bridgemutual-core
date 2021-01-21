// SPDX-License-Identifier: MIT
pragma solidity =0.7.4;
pragma experimental ABIEncoderV2;

import "./IPolicyBookFabric.sol";

interface IPolicyBookRegistry {
  /// @notice Adds PolicyBook to registry, access: PolicyFabric
  function add(address _insuredContract, address _policyBook) external;

  /// @notice Returns number of registered PolicyBooks, access: ANY
  /// @return _policyBooksCount is number of PolicyBooks
  function count() external view returns (uint256 _policyBooksCount);

  /// @notice Listing registered PolicyBooks, access: ANY
  /// @return _policyBooksCount is count of returned registered PolicyBook addresses
  /// @return _policyBooks is array of registered PolicyBook addresses
  function list(uint256 _offset, uint256 _limit)
    external
    view
    returns (uint256 _policyBooksCount, address[] memory _policyBooks);

  /// @notice Listing registered PolicyBooks, access: ANY
  /// @return _policyBooksCount is count of returned registered PolicyBook addresses
  /// @return _policyBooks is array of registered PolicyBook addresses
  /// @return _names is an array of PolicyBooks names
  /// @return _contractTypes is an array of insured contract types
  /// @return _maxCapacities is an array of max token amount that a user can buy
  /// @return _totalDaiLiquidity is an array of liquidities
  /// @return _annualProfitYields is an array of APYs
  function listWithStats(uint256 _offset, uint256 _limit)
    external
    view
    returns (
      uint256 _policyBooksCount, 
      address[] memory _policyBooks,
      string[] memory _names,
      IPolicyBookFabric.ContractType[] memory _contractTypes,
      uint256[] memory _maxCapacities,
      uint256[] memory _totalDaiLiquidity,
      uint256[] memory _annualProfitYields
    );

  /// @notice Return existing Policy Book contract, access: ANY
  /// @param _contract is contract address to lookup for created IPolicyBook
  /// @return _policyBook is policy book address if exists for passed contract address, if not it will return address(0)
  function policyBookFor(address _contract) external view returns (address _policyBook);

  /// @notice Getting stats from policy books, access: ANY
  /// @param _policyBooks is list of PolicyBooks addresses
  /// @return _names is array of names per PolicyBooks
  /// @return _contractTypes is array of insured contracts per PolicyBooks
  /// @return _maxCapacities is array of max capacities per PolicyBooks
  /// @return _totalDaiLiquidity is array of DAI liquidity per PolicyBooks
  /// @return _annualProfitYields is array of annual profit yields per PolicyBooks
  function stats(address[] calldata _policyBooks)
    external
    view
    returns (
      string[] memory _names,
      IPolicyBookFabric.ContractType[] memory _contractTypes,
      uint256[] memory _maxCapacities,
      uint256[] memory _totalDaiLiquidity,
      uint256[] memory _annualProfitYields
    );

  /// @notice Getting stats from policy books, access: ANY
  /// @param _insuredContracts is list of insuredContracts in registry
  /// @return _names is array of names per PolicyBooks
  /// @return _contractTypes is array of insured contracts per PolicyBooks
  /// @return _maxCapacities is array of max capacities per PolicyBooks
  /// @return _totalDaiLiquidity is array of DAI liquidity per PolicyBooks
  /// @return _annualProfitYields is array of annual profit yields per PolicyBooks
  function statsByInsuredContracts(address[] calldata _insuredContracts)
    external
    view
    returns (
      string[] memory _names,
      IPolicyBookFabric.ContractType[] memory _contractTypes,
      uint256[] memory _maxCapacities,
      uint256[] memory _totalDaiLiquidity,
      uint256[] memory _annualProfitYields
    );
}
