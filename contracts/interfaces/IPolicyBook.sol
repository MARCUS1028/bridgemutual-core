// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IPolicyBookFabric.sol";

interface IPolicyBook is IERC20 {
  struct Policy {
    uint256 id;
    uint256 holder;
    uint256 daiTokens;
    uint256 durationSeconds;
    uint256 coveredTokens;
    uint256 createdAt;
    bool claimed;
    bool rewarded;
  }

  // @TODO: should we let DAO to change contract address?
  /// @notice Returns address of contract this PolicyBook covers, access: ANY
  /// @return _contract is address of covered contract
  function getContractAddress() external view returns (address _contract);

  /// @notice Returns type of contract this PolicyBook covers, access: ANY
  /// @return _type is type of contract
  function getContractType() external view returns (IPolicyBookFabric.ContractType _type);

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

  /// @notice Returns list of policies, access: ANY
  /// @param _offset is starting item in array to return array from
  /// @param _limit is number of policies to returns from _offset
  /// @return _policiesCount is number of added policies
  /// @return _policies is array of active & inactive policies
  function policies(uint256 _offset, uint256 _limit)
    external
    view
    returns (uint256 _policiesCount, Policy[] memory _policies);

  /// @notice Returns number of policies added, access: ANY
  /// @return _policiesCount is number of all added policies
  function policiesCount() external view returns (uint256 _policiesCount);

  /// @notice Returns list of policies, access: ANY
  /// @param _policiesIds is array of policy ids to return
  /// @return _policies is array of active & inactive policies
  function policies(uint256[] memory _policiesIds) external view returns (Policy[] memory _policies);

  /// @notice Returns policy by supplied id, access: ANY
  /// @param _policyId is id of policy to return
  /// @return _policy is policy corresponding to supplied id
  function policy(uint256 _policyId) external view returns (Policy memory _policy);

  /// @notice Returns list of liquidity providers, access: ANY
  /// @param _offset is starting item in array to return array from
  /// @param _limit is number of securities to returns from _offset
  /// @return _holdersCount is total number of liquidity providers
  /// @return _holders is array of liquidity providers addresses
  /// @return _balances is array of liquidity balances of Policy Book (BMI X) token
  function balanceOf(uint256 _offset, uint256 _limit)
    external
    view
    returns (
      uint256 _holdersCount,
      address[] memory _holders,
      uint256[] memory _balances
    );

  /// @notice Returns liquidity providers balances for specific liquidity providers, access: ANY
  /// @param _holders is array of liquidity providers addresses to return balances for
  /// @return _balances is array of liquidity balances of Policy Book (BMI X) token
  function balanceOf(address[] memory _holders) external view returns (uint256[] memory _balances);

  /// @notice Returns number of liquidity providers, access: ANY
  /// @return _count is total number of liquidity providers
  function holdersCount() external view returns (uint256 _count);

  /// @notice Returns total amount of secured DAI, access: ANY
  /// @return _daiTokens is secured amount of DAI by liquidity providers
  function totalLiquidityDAI() external view returns (uint256 _daiTokens);

  /// @notice Returns total amount of paid DAI for Policies, access: ANY
  /// @return _daiTokens is paid amount of DAI for Policy coverage
  function totalPoliciesDAI() external view returns (uint256 _daiTokens);

  /// @notice Adds shield tokens to contract, access: ANY
  /// @param _tokenAddress is address of reward token to add
  /// @param _tokensAmount is max amount of reward to operate on
  /// @return _success is indicator if purchase is successful, it will throw exception if unsuccessful
  function addShieldTokens(address _tokenAddress, uint256 _tokensAmount) external returns (bool _success);

  /// @notice Let user to buy policy by supplying DAI, access: ANY
  /// @param _durationSeconds is number of seconds to cover
  /// @param _coverTokens is number of tokens to cover
  /// @param _maxDaiTokens is number of DAI to spend
  function buyPolicy(
    uint256 _durationSeconds,
    uint256 _coverTokens,
    uint256 _maxDaiTokens
  ) external;

  /// @notice Let user to buy policy for another user by supplying DAI, access: ANY
  /// @param _policyHolderAddr is address of address to assign cover
  /// @param _durationSeconds is number of seconds to cover
  /// @param _coverTokens is number of tokens to cover
  /// @param _maxDaiTokens is number of DAI to spend
  function buyPolicyFor(
    address _policyHolderAddr,
    uint256 _durationSeconds,
    uint256 _coverTokens,
    uint256 _maxDaiTokens
  ) external;

  /// @notice Let user to add liquidity by supplying DAI, access: ANY
  /// @param _liqudityAmount is amount of DAI tokens to secure
  function addLiquidity(uint256 _liqudityAmount) external;

  /// @notice Let user to add liqiudity for another user by supplying DAI, access: ANY
  /// @param _liquidityHolderAddr is address of address to assign cover
  /// @param _liqudityAmount is amount of DAI tokens to secure
  function addLiquidityFor(address _liquidityHolderAddr, uint256 _liqudityAmount) external;

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
  /// @return _yearlyCost
  /// @return _maxCapacities is max DAI amount to be covered at now
  /// @return _totalDaiLiquidity is DAI amount placed by Policy providers
  /// @return _annualProfitYields is current annual profit yield
  function stats()
    external
    returns (
      uint256 _yearlyCost,
      uint256 _maxCapacities,
      uint256 _totalDaiLiquidity,
      uint256 _annualProfitYields
    );
}
