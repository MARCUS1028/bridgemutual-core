// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "./IPool.sol";

interface IPoolGateway is IPool {
  struct DistributionPool {
    address pool;
    address poolGatewayStrategy;
  }

  /// @notice Returns list of distribution pools, access: ANY
  /// @param _offset is starting item in array to return array from
  /// @param _limit is number of distribution pools to returns from _offset
  /// @return _distributionPoolsCount is total number of distribution pools
  /// @return _distributionPools is subset of distribution pools
  function distributionPools(uint256 _offset, uint256 _limit)
    external
    view
    returns (uint256 _distributionPoolsCount, DistributionPool[] memory _distributionPools);

  /// @notice Returns list of distribution pools, access: ANY
  /// @param _distributionPoolId is id of distribution to return
  /// @return _distributionPool is distribution pool referred by _distributionId
  function distributionPool(uint256 _distributionPoolId)
    external
    view
    returns (DistributionPool memory _distributionPool);

  /// @notice Returns number of distribution pools, access: ANY
  /// @return _distributionPoolsCount is total number of distribution pools
  function distributionPoolsCount() external view returns (uint256 _distributionPoolsCount);

  /// @notice Adds distribution to pass captured tokens to, gateway can have multiple records of same pool with different pool strategies, access: DAO
  /// @param _pool is address of pool to be added
  /// @param _poolStrategy is pool strategy that pool is assigned to
  /// @return _distributionPoolId is total number of distribution pools
  function addDistributionPool(address _pool, address _poolStrategy) external returns (uint256 _distributionPoolId);

  /// @notice Updates distribution by passed id, access: DAO
  /// @param _distributionPoolId is id of pool distribution should be updated
  /// @param _pool is address of pool to change to
  /// @param _poolStrategy is pool strategy address to change to
  function updateDistributionPool(
    uint256 _distributionPoolId,
    address _pool,
    address _poolStrategy
  ) external;

  /// @notice Removes distribution by passed id, access: DAO
  /// @param _distributionPoolId is id of pool distribution should be removed
  function removeDistributionPool(uint256 _distributionPoolId) external;
}
