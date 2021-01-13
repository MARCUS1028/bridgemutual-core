// SPDX-License-Identifier: MIT
pragma solidity =0.7.4;

import "./IPolicyFabric.sol";

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

  /// @notice Return existing Policy Book contract, access: ANY
  /// @param _contract is contract address to lookup for created IPolicyBook
  /// @return _policyBook is policy book address if exists for passed contract address, if not it will return address(0)
  function policyBookFor(address _contract) external view returns (address _policyBook);

  /// @notice Getting stats from policy books, access: ANY
  /// @param _policyBooks is list of PolicyBooks addresses
  /// @return _yearlyCost is array of yearly costs per PolicyBooks
  /// @return _maxCapacities is array of max capacities per PolicyBooks
  /// @return _totalDaiLiquidity is array of DAI liquidity per PolicyBooks
  /// @return _annualProfitYields is array of annual profit yields per PolicyBooks
  function stats(address[] calldata _policyBooks)
    external
    returns (
      uint256[] memory _yearlyCost,
      uint256[] memory _maxCapacities,
      uint256[] memory _totalDaiLiquidity,
      uint256[] memory _annualProfitYields
    );

  /// @notice Getting stats from policy books, access: ANY
  /// @param _insuredContracts is list of insuredContracts in registry
  /// @return _yearlyCost is array of yearly costs per PolicyBooks
  /// @return _maxCapacities is array of max capacities per PolicyBooks
  /// @return _totalDaiLiquidity is array of DAI liquidity per PolicyBooks
  /// @return _annualProfitYields is array of annual profit yields per PolicyBooks
  function statsByInsuredContracts(address[] calldata _insuredContracts)
    external
    returns (
      uint256[] memory _yearlyCost,
      uint256[] memory _maxCapacities,
      uint256[] memory _totalDaiLiquidity,
      uint256[] memory _annualProfitYields
    );
}
