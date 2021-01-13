// SPDX-License-Identifier: MIT
pragma solidity =0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "./interfaces/IPolicyBook.sol";
import "./interfaces/IPolicyBookFabric.sol";

contract PolicyBook is IPolicyBook, ERC20 {
  address private contractAddress_;
  IPolicyBookFabric.ContractType private contractType_;

  constructor(address _contract, IPolicyBookFabric.ContractType _contractType)
    ERC20("BridgeMutual Insurance", "bmiDAIx")
  {
    contractAddress_ = _contract;
    contractType_ = _contractType;
  }

  function contractAddress() external view override returns (address _contract) {
    return contractAddress_;
  }

  function contractType() external view override returns (IPolicyBookFabric.ContractType _type) {
    return contractType_;
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
  uint256 public constant PERSENTAGE_100 = 100 * PRECISION;

  uint256 public constant MINIMUM_COST_PERSENTAGE = 5 * PRECISION;
  uint256 public constant RISKY_ASSET_TRESHOLD_PERSENTAGE = 70 * PRECISION;
  uint256 public constant MAXIMUM_COST_NOT_RISKY_PERSENTAGE = 30 * PRECISION;
  uint256 public constant MAXIMUM_COST_100_UTILIZATION_PERSENTAGE = 150 * PRECISION;

  uint256 public daiInThePoolTotal;
  uint256 public daiInThePoolBought;

  function calculateWhenNotRisky(uint256 _utilizationRatioPersentage) internal pure returns (uint256 _persentage) {
    return (_utilizationRatioPersentage * MAXIMUM_COST_NOT_RISKY_PERSENTAGE) / RISKY_ASSET_TRESHOLD_PERSENTAGE;
  }

  function calculateWhenIsRisky(uint256 _utilizationRatioPersentage) internal pure returns (uint256 _persentage) {
    uint256 riskyRelation =
      (PRECISION * (_utilizationRatioPersentage - RISKY_ASSET_TRESHOLD_PERSENTAGE)) /
        (PERSENTAGE_100 - RISKY_ASSET_TRESHOLD_PERSENTAGE);

    return
      MAXIMUM_COST_NOT_RISKY_PERSENTAGE +
      (riskyRelation * (MAXIMUM_COST_100_UTILIZATION_PERSENTAGE - MAXIMUM_COST_NOT_RISKY_PERSENTAGE)) /
      PRECISION;
  }

  function getQuote(uint256 _durationDays, uint256 _tokens) external view override returns (uint256 _daiTokens) {
    require(daiInThePoolBought + _tokens <= daiInThePoolTotal, "Requiring more than there exists");

    uint256 utilizationRatioPersentage = ((daiInThePoolBought + _tokens) * PERSENTAGE_100) / daiInThePoolTotal;

    uint256 annualInsuranceCostPersentage;

    if (utilizationRatioPersentage < RISKY_ASSET_TRESHOLD_PERSENTAGE) {
      annualInsuranceCostPersentage = calculateWhenNotRisky(utilizationRatioPersentage);
    } else {
      annualInsuranceCostPersentage = calculateWhenIsRisky(utilizationRatioPersentage);
    }

    annualInsuranceCostPersentage = (
      annualInsuranceCostPersentage > MINIMUM_COST_PERSENTAGE ? annualInsuranceCostPersentage : MINIMUM_COST_PERSENTAGE
    );

    uint256 actualInsuranceCostPersentage = (_durationDays * annualInsuranceCostPersentage) / DAYS_IN_THE_YEAR;

    return (_tokens * actualInsuranceCostPersentage) / PERSENTAGE_100;
  }
}
