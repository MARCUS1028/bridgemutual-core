// SPDX-License-Identifier: MIT
pragma solidity =0.7.4;

interface IPolicyBookFabric {
  enum ContractType {STABLECOIN, DEFI, CONTRACT, EXCHANGE}

  /// @notice Create new Policy Book contract, access: ANY
  /// @param _contract is Contract to create policy book for
  /// @param _contractType is Contract to create policy book for
  /// @return _policyBook is address of created contract
  function create(address _contract, ContractType _contractType) external returns (address _policyBook);

  /// @notice Return created Policy Book contract, access: ANY
  /// @param _contract is contract address to lookup for created IPolicyBook
  /// @return _policyBook is policy book address if exists for passed contract address, if not it will return address(0)
  function policyBookFor(address _contract) external view returns (address _policyBook);

  /// @notice Returns number of created Policy Book contracts, access: ANY
  /// @return _policyBookCount is number of created policy books
  function policyBooksCount() external view returns (uint256 _policyBookCount);

  /// @notice Returns number of created Policy Book contracts address, access: ANY
  /// @param _offset is starting item in array to return array from
  /// @param _limit is number of policy books to returns from _offset
  /// @return _policyBooksCount is updated number of policy books
  /// @return _policyBooks is array of contract addresses
  function policyBooks(uint256 _offset, uint256 _limit)
    external
    view
    returns (uint256 _policyBooksCount, address[] memory _policyBooks);
}
