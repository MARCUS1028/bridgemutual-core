// SPDX-License-Identifier: MIT
pragma solidity =0.7.4;

interface IPoolGatewayStrategy {
  /// @notice Calculate amount of tokens to be sent to pool, access: ANY
  /// @param _sender is address of sender
  /// @param _daiTokens is number of tokens received from sender
  /// @return _daiTokensFraction is number of tokens to be send to pool
  function captureTokensAmount(address _sender, uint256 _daiTokens) external returns (uint256 _daiTokensFraction);

  /// @notice Calculate amount of tokens to be sent to receiver, access: ANY
  /// @param _receiver is address of receiver
  /// @param _daiTokens is number of tokens received from sender
  /// @return _daiTokensFraction is number of tokens to be send to receiver
  function releaseTokensAmount(address _receiver, uint256 _daiTokens) external returns (uint256 _daiTokensFraction);
}
