// SPDX-License-Identifier: MIT
pragma solidity =0.7.4;

interface IPool {
  /// @notice Returns token this Pool is operating with access: ANY
  /// @return _token address of token this pool created for
  function token() external view returns (address _token);

  /// @notice Store tokens to pool, access: ANY
  /// @param _tokensAmount number of tokens that should be added to Pool
  function capture(uint256 _tokensAmount) external;

  /// @notice Release tokens from pool, access: ANY
  /// @param _tokensAmount number of tokens that should be release from Pool
  function release(uint256 _tokensAmount) external;

  /// @notice Store tokens to pool and assign it to passed address, access: ANY
  /// @param _address address of account/contract that is willing to put tokens to Pool
  /// @param _tokensAmount number of tokens that should be added to Pool
  function captureFor(address _address, uint256 _tokensAmount) external;

  // @TODO: verify that msg.sender is allowed to call releaseFor, it can be same who added tokens
  /// @notice Release tokens from pool and transfer them to assigned address, access: ANY
  /// @param _address address of account/contract that Pool has to transfer tokens to
  /// @param _tokensAmount number of tokens that should be release from Pool
  function releaseFor(address _address, uint256 _tokensAmount) external;

  /// @notice Returns tokens balance of passed address in Pool, access: ANY
  /// @param _address address of account/contract to return balance of
  /// @return _tokensAmount is number of tokens stored in Pool
  function balanceOf(address _address) external view returns (uint256 _tokensAmount);
}
