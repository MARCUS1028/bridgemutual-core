// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;

interface IPoolGatewayStrategy {
  /// @notice Calculate amount of tokens to be sent to pool, access: ANY
  /// @param _sender is address of sender
  /// @param _tokens is number of tokens received from sender
  /// @param _pool is address of pool
  /// @param _tokens is number of tokens received from sender
  /// @return _tokensFraction is number of tokens to be send to pool
  function captureTokensAmount(
    address _sender,
    address _pool,
    uint256 _tokens
  ) external returns (uint256 _tokensFraction);

  /// @notice Calculate amount of tokens to be released to receiver, access: ANY
  /// @param _receiver is address of receiver
  /// @param _tokens is number of tokens requested by sender
  /// @param _pool is address of pool
  /// @return _tokensFraction is number of tokens to be send to receiver
  function releaseTokensAmount(
    address _receiver,
    address _pool,
    uint256 _tokens
  ) external returns (uint256 _tokensFraction);
}
