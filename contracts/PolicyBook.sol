// SPDX-License-Identifier: MIT
pragma solidity =0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "./interfaces/IPolicyBook.sol";
import "./interfaces/IPolicyBookFabric.sol";

contract PolicyBook is IPolicyBook, ERC20 {
  address private _contractAddress;
  IPolicyBookFabric.ContractType private _contractType;

  constructor(address _contract, IPolicyBookFabric.ContractType _type) ERC20("BridgeMutual Insurance", "bmiDAIx") {
    _contractAddress = _contract;
    _contractType = _type;
  }

  function contractAddress() external view override returns (address _contract) {
    return _contractAddress;
  }

  function contractType() external view override returns (IPolicyBookFabric.ContractType _type) {
    return _contractType;
  }

  function quoteStrategy() external view override returns (address _quoteStrategy) {
    return address(0);
  }

  function shieldAssets(uint256 _offset, uint256 _limit)
    external
    view
    override
    returns (uint256 _shieldAssetsCount, address[] memory _shieldAssets)
  {
    address[] memory temp;
    return (0, temp);
  }

  function shieldAssetsWithBalance(uint256 _offset, uint256 _limit)
    external
    view
    override
    returns (
      uint256 _shieldAssetsCount,
      address[] memory _shieldAssets,
      uint256[] memory _shieldAssetBalance
    )
  {
    address[] memory temp1;
    uint256[] memory temp2;
    return (0, temp1, temp2);
  }

  function shieldAssetsCount() external view override returns (uint256 _shieldAssetsCount) {
    return 0;
  }

  function policies(uint256 _offset, uint256 _limit)
    external
    view
    override
    returns (uint256 _policiesCount, Policy[] memory _policies)
  {
    Policy[] memory temp;
    return (0, temp);
  }

  function policiesCount() external view override returns (uint256 _policiesCount) {
    return 0;
  }

  function policies(uint256[] memory _policiesIds) external view override returns (Policy[] memory _policies) {
    Policy[] memory temp;
    return temp;
  }

  function policy(uint256 _policyId) external view override returns (Policy memory _policy) {
    Policy memory temp;
    return temp;
  }

  function balanceOf(uint256 _offset, uint256 _limit)
    external
    view
    override
    returns (
      uint256 _holdersCount,
      address[] memory _holders,
      uint256[] memory _balances
    )
  {
    address[] memory temp1;
    uint256[] memory temp2;
    return (0, temp1, temp2);
  }

  function balanceOf(address[] memory _holders) external view override returns (uint256[] memory _balances) {
    uint256[] memory temp;
    return temp;
  }

  function holdersCount() external view override returns (uint256 _count) {
    return 0;
  }

  function totalLiquidityDAI() external view override returns (uint256 _daiTokens) {
    return 0;
  }

  function totalPoliciesDAI() external view override returns (uint256 _daiTokens) {
    return 0;
  }

  function addShieldTokens(address _tokenAddress, uint256 _tokensAmount) external override returns (bool _success) {
    return false;
  }

  function buyPolicy(
    uint256 _durationDays,
    uint256 _coverTokens,
    uint256 _maxDaiTokens
  ) external override returns (uint256 _policyId) {
    return 0;
  }

  function buyPolicyFor(
    address _policyHolder,
    uint256 _durationDays,
    uint256 _coverTokens,
    uint256 _maxDaiTokens
  ) external override returns (uint256 _policyId) {
    return 0;
  }

  function addLiquidity(uint256 _daiTokens) external override {}

  function addLiquidityFor(address _liquidityHolder, uint256 _daiTokens) external override {}

  function rewardForUnclaimedExpiredPolicy(uint256 _policyId) external override {}

  function stats()
    external
    override
    returns (
      uint256 _yearlyCost,
      uint256 _maxCapacities,
      uint256 _totalDaiLiquidity,
      uint256 _annualProfitYields
    )
  {
    return (0, 0, 0, 0);
  }

  uint256 public constant DAYS_IN_THE_YEAR = 365;
  uint256 public constant PRECISION = 10**10;
  uint256 public constant PERCENTAGE_100 = 100 * PRECISION;

  uint256 public constant MINIMUM_COST_PERCENTAGE = 5 * PRECISION;
  uint256 public constant RISKY_ASSET_THRESHOLD_PERCENTAGE = 70 * PRECISION;
  uint256 public constant MAXIMUM_COST_NOT_RISKY_PERCENTAGE = 30 * PRECISION;
  uint256 public constant MAXIMUM_COST_100_UTILIZATION_PERCENTAGE = 150 * PRECISION;

  uint256 public daiInThePoolTotal;
  uint256 public daiInThePoolBought;

  function calculateWhenNotRisky(uint256 _utilizationRatioPercentage) private pure returns (uint256) {
    return (_utilizationRatioPercentage * MAXIMUM_COST_NOT_RISKY_PERCENTAGE) / RISKY_ASSET_THRESHOLD_PERCENTAGE;
  }

  function calculateWhenIsRisky(uint256 _utilizationRatioPercentage) private pure returns (uint256) {
    uint256 riskyRelation =
      (PRECISION * (_utilizationRatioPercentage - RISKY_ASSET_THRESHOLD_PERCENTAGE)) /
        (PERCENTAGE_100 - RISKY_ASSET_THRESHOLD_PERCENTAGE);

    return
      MAXIMUM_COST_NOT_RISKY_PERCENTAGE +
      (riskyRelation * (MAXIMUM_COST_100_UTILIZATION_PERCENTAGE - MAXIMUM_COST_NOT_RISKY_PERCENTAGE)) /
      PRECISION;
  }

  function getQuote(uint256 _durationDays, uint256 _tokens) external view override returns (uint256 _daiTokens) {
    require(daiInThePoolBought + _tokens <= daiInThePoolTotal, "Requiring more than there exists");
    require(daiInThePoolTotal > 0, "The pool is empty");
    require(RISKY_ASSET_THRESHOLD_PERCENTAGE < PERCENTAGE_100, "Risky asset threshold should be less than 100%");

    uint256 utilizationRatioPercentage = ((daiInThePoolBought + _tokens) * PERCENTAGE_100) / daiInThePoolTotal;

    uint256 annualInsuranceCostPercentage;

    if (utilizationRatioPercentage < RISKY_ASSET_THRESHOLD_PERCENTAGE) {
      annualInsuranceCostPercentage = calculateWhenNotRisky(utilizationRatioPercentage);
    } else {
      annualInsuranceCostPercentage = calculateWhenIsRisky(utilizationRatioPercentage);
    }

    annualInsuranceCostPercentage = (
      annualInsuranceCostPercentage > MINIMUM_COST_PERCENTAGE ? annualInsuranceCostPercentage : MINIMUM_COST_PERCENTAGE
    );

    uint256 actualInsuranceCostPercentage = (_durationDays * annualInsuranceCostPercentage) / DAYS_IN_THE_YEAR;

    return (_tokens * actualInsuranceCostPercentage) / PERCENTAGE_100;
  }
}
