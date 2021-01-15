// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";

import "./interfaces/IPolicyBook.sol";
import "./interfaces/IPolicyBookFabric.sol";
import "./DAIMock.sol";

contract PolicyBook is IPolicyBook, ERC20 {
  using SafeMath for uint256;
  using Math for uint256;

  address contractAddress_;
  IPolicyBookFabric.ContractType contractType_;
  address daiAddr;

  uint256 public totalLiquidity;
  uint256 public totalCoverTokens;

  struct LiquidityHolder {
    uint256 depositedAmount;
    uint256 lastUpdate;
  }

  struct PolicyHolder {
    uint256 coverTokens;
    uint256 durationDays;
    uint256 maxDaiTokens;
  }

  mapping(address => LiquidityHolder) public liquidityHolders;
  mapping(address => PolicyHolder) public policyHolders;

  constructor(address _contract, IPolicyBookFabric.ContractType _contractType, address _daiAddr)
    ERC20("BridgeMutual Insurance", "bmiDAIx")
  {
    contractAddress_ = _contract;
    contractType_ = _contractType;
    daiAddr = _daiAddr;
  }

  receive() external payable {}

  function contractAddress() external view override returns (address) {
    return contractAddress_;
  }

  function contractType() external view override returns (IPolicyBookFabric.ContractType) {
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
  ) external override {
    PolicyHolder memory _policyHolder = policyHolders[msg.sender];
    require(_policyHolder.durationDays == 0, "The policy holder already exists");
    require(totalLiquidity >= totalCoverTokens.add(_coverTokens), "Not enough available liquidity");

    _policyHolder.coverTokens = _coverTokens;
    _policyHolder.durationDays = _durationDays;
    _policyHolder.maxDaiTokens = _maxDaiTokens;

    policyHolders[msg.sender] = _policyHolder;
    totalCoverTokens = totalCoverTokens.add(_coverTokens);

    DAIMock dai = DAIMock(daiAddr);
    bool _success = dai.transferFrom(msg.sender, address(this), _calculatePrice(_coverTokens));
    require(_success, "Failed to transfer tokens");
  }

  function buyPolicyFor(
    address _policyHolderAddr,
    uint256 _durationDays,
    uint256 _coverTokens,
    uint256 _maxDaiTokens
  ) external override {
    PolicyHolder memory _policyHolder = policyHolders[_policyHolderAddr];
    require(_policyHolder.durationDays == 0, "The policy holder already exists");
    require(totalLiquidity >= totalCoverTokens.add(_coverTokens), "Not enough available liquidity");

    _policyHolder.coverTokens = _coverTokens;
    _policyHolder.durationDays = _durationDays;
    _policyHolder.maxDaiTokens = _maxDaiTokens;

    policyHolders[_policyHolderAddr] = _policyHolder;
    totalCoverTokens = totalCoverTokens.add(_coverTokens);

    DAIMock dai = DAIMock(daiAddr);
    bool _success = dai.transferFrom(_policyHolderAddr, address(this), _calculatePrice(_coverTokens));
    require(_success, "Failed to transfer tokens");
  }

  function _calculatePrice(uint256 _coverTokens) internal view returns (uint256) {
    return 100;
  }

  function addLiquidity(uint256 _daiTokens) external override {
    LiquidityHolder memory _liquidityHolder = liquidityHolders[msg.sender];

    uint256 _calculatedInterest;
    if (_liquidityHolder.lastUpdate > 0) {
      _calculatedInterest = _calculateInterest(msg.sender);
    }

    uint256 _tokensToAdd = _daiTokens.add(_calculatedInterest);

    _liquidityHolder.depositedAmount = _liquidityHolder.depositedAmount.add(_tokensToAdd);
    _liquidityHolder.lastUpdate = block.timestamp;

    liquidityHolders[msg.sender] = _liquidityHolder;

    totalLiquidity = totalLiquidity.add(_tokensToAdd);

    DAIMock dai = DAIMock(daiAddr);
    bool _success = dai.transferFrom(msg.sender, address(this), _daiTokens);
    require(_success, "Failed to transfer tokens");
  }

  function addLiquidityFor(address _liquidityHolderAddr, uint256 _daiTokens) external override {
    LiquidityHolder memory _liquidityHolder = liquidityHolders[_liquidityHolderAddr];

    uint256 _calculatedInterest;
    if (_liquidityHolder.lastUpdate > 0) {
      _calculatedInterest = _calculateInterest(_liquidityHolderAddr);
    }

    uint256 _tokensToAdd = _daiTokens.add(_calculatedInterest);

    _liquidityHolder.depositedAmount = _liquidityHolder.depositedAmount.add(_tokensToAdd);
    _liquidityHolder.lastUpdate = block.timestamp;

    liquidityHolders[_liquidityHolderAddr] = _liquidityHolder;

    totalLiquidity = totalLiquidity.add(_tokensToAdd);

    DAIMock dai = DAIMock(daiAddr);
    bool _success = dai.transferFrom(_liquidityHolderAddr, address(this), _daiTokens);
    require(_success, "Failed to transfer tokens");
  }

  function withdrawLiquidity(uint256 _tokensToWithdraw) external {
    LiquidityHolder memory _liquidityHolder = liquidityHolders[msg.sender];

    require(_liquidityHolder.lastUpdate > 0, "Liquidity holder does not exists");

    uint256 _calculatedInterest = _calculateInterest(msg.sender);
    _liquidityHolder.depositedAmount = _liquidityHolder.depositedAmount.add(_calculatedInterest);
    totalLiquidity = totalLiquidity.add(_calculatedInterest);

    require(
      _liquidityHolder.depositedAmount >= _tokensToWithdraw,
      "The amount to be withdrawn is greater than the deposited amount"
    );

    require(totalLiquidity.sub(_tokensToWithdraw) >= totalCoverTokens, "Not enough available liquidity");

    _liquidityHolder.depositedAmount = _liquidityHolder.depositedAmount.sub(_tokensToWithdraw);
    _liquidityHolder.lastUpdate = block.timestamp;

    liquidityHolders[msg.sender] = _liquidityHolder;

    totalLiquidity = totalLiquidity.sub(_tokensToWithdraw);

    DAIMock dai = DAIMock(daiAddr);
    bool _success = dai.transfer(msg.sender, _tokensToWithdraw);
    require(_success, "Failed to transfer tokens");
  }

  function _calculateInterest(address _policyHolder) internal view returns (uint256) {
    return 0;
  }

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
    return (_utilizationRatioPercentage.mul(MAXIMUM_COST_NOT_RISKY_PERCENTAGE)).div(RISKY_ASSET_THRESHOLD_PERCENTAGE);
  }

  function calculateWhenIsRisky(uint256 _utilizationRatioPercentage) private pure returns (uint256) {
    uint256 riskyRelation =
      (PRECISION.mul(_utilizationRatioPercentage.sub(RISKY_ASSET_THRESHOLD_PERCENTAGE))).div(
        (PERCENTAGE_100.sub(RISKY_ASSET_THRESHOLD_PERCENTAGE))
      );

    return
      MAXIMUM_COST_NOT_RISKY_PERCENTAGE.add(
        (riskyRelation.mul(MAXIMUM_COST_100_UTILIZATION_PERCENTAGE.sub(MAXIMUM_COST_NOT_RISKY_PERCENTAGE))).div(
          PRECISION
        )
      );
  }

  function getQuote(uint256 _durationDays, uint256 _tokens) external view override returns (uint256 _daiTokens) {
    require(daiInThePoolBought.add(_tokens) <= daiInThePoolTotal, "Requiring more than there exists");
    require(daiInThePoolTotal > 0, "The pool is empty");

    uint256 utilizationRatioPercentage = ((daiInThePoolBought.add(_tokens)).mul(PERCENTAGE_100)).div(daiInThePoolTotal);

    uint256 annualInsuranceCostPercentage;

    if (utilizationRatioPercentage < RISKY_ASSET_THRESHOLD_PERCENTAGE) {
      annualInsuranceCostPercentage = calculateWhenNotRisky(utilizationRatioPercentage);
    } else {
      annualInsuranceCostPercentage = calculateWhenIsRisky(utilizationRatioPercentage);
    }

    annualInsuranceCostPercentage = Math.max(annualInsuranceCostPercentage, MINIMUM_COST_PERCENTAGE);

    uint256 actualInsuranceCostPercentage = (_durationDays.mul(annualInsuranceCostPercentage)).div(DAYS_IN_THE_YEAR);

    return (_tokens.mul(actualInsuranceCostPercentage)).div(PERCENTAGE_100);
  }
}
