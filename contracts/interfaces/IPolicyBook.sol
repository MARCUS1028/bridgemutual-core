// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "./IPolicyBookFabric.sol";

interface IPolicyBook {
  // @TODO: should we let DAO to change contract address?
  /// @notice Returns address of contract this PolicyBook covers, access: ANY
  /// @return _contract is address of covered contract
  function insuranceContractAddress() external view returns (address _contract);

  /// @notice Returns type of contract this PolicyBook covers, access: ANY
  /// @return _type is type of contract
  function contractType() external view returns (IPolicyBookFabric.ContractType _type);

  /// @notice Returns quote strategy defined during creation of PolicyBook, access: ANY
  /// @return _quoteStrategy is address of Quote strategy contract used to calculate quote
  function quoteStrategy() external view returns (address _quoteStrategy);

  // @TODO: Vector Attack - Hacker? can add too many shield tokens, 
  // that will be impossible to calculate tokens portion to give to Policy giver
  /// @notice Returns list of shield assets added to PolicyBook, access: ANY
  /// @param _offset is starting item in array to return array from
  /// @param _limit is number of policy books to returns from _offset
  /// @return _shieldAssetsCount is number of added shield assets
  /// @return _shieldAssets is addresses of shield assets, that will be distributed to Policy givers
  function shieldAssets(uint256 _offset, uint256 _limit)
    external
    view
    returns (uint256 _shieldAssetsCount, address[] memory _shieldAssets);

  /// @notice Returns list of shield assets added with tokens amount allocated to Policy Book, access: ANY
  /// @param _offset is starting item in array to return array from
  /// @param _limit is number of policy books to returns from _offset
  /// @return _shieldAssetsCount is number of added shield assets
  /// @return _shieldAssets is addresses of shield assets, that will be distributed to Policy givers
  /// @return _shieldAssetBalance is tokens amount of shield assets allocated to Policy Book, 
  /// to get specific shield asset balance lookup _shieldAssetBalances by same index as of shield asset
  function shieldAssetsWithBalance(uint256 _offset, uint256 _limit)
    external
    view
    returns (
      uint256 _shieldAssetsCount,
      address[] memory _shieldAssets,
      uint256[] memory _shieldAssetBalance
    );

  /// @notice Returns number of shield assets added, access: ANY
  /// @return _shieldAssetsCount is number of added shield assets
  function shieldAssetsCount() external view returns (uint256 _shieldAssetsCount);

  /// @notice Adds shield tokens to contract, access: ANY
  /// @param _tokenAddress is address of reward token to add
  /// @param _tokensAmount is max amount of reward to operate on
  /// @return _success is indicator if purchase is successful, it will throw exception if unsuccessful
  function addShieldTokens(address _tokenAddress, uint256 _tokensAmount) external returns (bool _success);

  /// @notice Let user to buy policy by supplying DAI, access: ANY
  /// @param _durationSeconds is number of seconds to cover
  /// @param _coverTokens is number of tokens to cover  
  function buyPolicy(
    uint256 _durationSeconds,
    uint256 _coverTokens
  ) external;

  /// @notice Let user to buy policy for another user by supplying DAI, access: ANY
  /// @param _policyHolderAddr is address of address to assign cover
  /// @param _durationSeconds is number of seconds to cover
  /// @param _coverTokens is number of tokens to cover  
  function buyPolicyFor(
    address _policyHolderAddr,
    uint256 _durationSeconds,
    uint256 _coverTokens
  ) external;

  /// @notice Let user to add liquidity by supplying DAI, access: ANY
  /// @param _liqudityAmount is amount of DAI tokens to secure
  function addLiquidity(uint256 _liqudityAmount) external;

  /// @notice Let user to add liqiudity for another user by supplying DAI, access: ANY
  /// @param _liquidityHolderAddr is address of address to assign cover
  /// @param _liqudityAmount is amount of DAI tokens to secure
  function addLiquidityFor(address _liquidityHolderAddr, uint256 _liqudityAmount) external;

  /// @notice Let liquidityMining contract to add liqiudity for another user by supplying DAI, access: ONLY LM
  /// @param _liquidityHolderAddr is address of address to assign cover
  /// @param _liqudityAmount is amount of DAI tokens to secure
  function addLiquidityFromLM(address _liquidityHolderAddr, uint256 _liqudityAmount) external;

  /// @notice Let user to withdraw deposited liqiudity, access: ANY
  /// @param _tokensToWithdraw is amount of DAI tokens to withdraw
  function withdrawLiquidity(uint256 _tokensToWithdraw) external;

  /// @notice Let user to calculate policy cost in DAI, access: ANY
  /// @param _durationSeconds is number of seconds to cover
  /// @param _tokens is number of tokens to cover
  /// @return _daiTokens is amount of DAI policy costs
  function getQuote(uint256 _durationSeconds, uint256 _tokens) external view returns (uint256 _daiTokens);

  /// @notice Let user to claim rewards for unclaimed policy cost in DAI, access: ANY
  /// @param _policyId is id of policy to get reward for, reward will be sent to policy holder
  function rewardForUnclaimedExpiredPolicy(uint256 _policyId) external;

  /// @notice Getting stats, access: ANY
  /// @return _name is the name of PolicyBook
  /// @return _insuredContract is an addres of insured contract
  /// @return _contractType is a type of insured contract
  /// @return _maxCapacities is a max token amount that a user can buy
  /// @return _totalDaiLiquidity is PolicyBook's liquidity
  /// @return _annualProfitYields is its APY  
  function stats()
    external
    view
    returns (
      string memory _name,
      address _insuredContract,
      IPolicyBookFabric.ContractType _contractType,
      uint256 _maxCapacities,
      uint256 _totalDaiLiquidity,
      uint256 _annualProfitYields      
    );
}
