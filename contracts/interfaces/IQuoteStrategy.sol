// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;

interface IQuoteStrategy {
  /// @notice Calculate amount of Token to pay for coverage (calculates by DAI and then convert to final token), access: ANY
  /// @param _durationDays is number of days to cover
  /// @param _coverTokens is number of tokens to cover
  /// @return _tokens is number of tokens policy costs
  function calculate(
    address _policyBook,
    uint256 _durationDays,
    uint256 _coverTokens
  ) external view returns (uint256 _tokens);
}
