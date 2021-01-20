// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";

import "./interfaces/IPolicyBook.sol";
import "./interfaces/IPolicyBookFabric.sol";

contract PolicyBook is IPolicyBook, ERC20 {
  using SafeMath for uint256;
  using Math for uint256;

  address contractAddress;
  IPolicyBookFabric.ContractType contractType;
  address daiAddr;

  uint256 public totalLiquidity;
  uint256 public totalCoverTokens;

  struct LiquidityHolder {
    uint256 depositedAmount;
    uint256 lastUpdate;
  }

  struct PolicyHolder {
    uint256 coverTokens;
    uint256 durationSeconds;
    uint256 maxDaiTokens;
  }

  mapping(address => LiquidityHolder) public liquidityHolders;
  mapping(address => PolicyHolder) public policyHolders;

  event AddLiquidity(address _liquidityHolder, uint256 _liqudityAmount, uint256 _newTotalLiquidity);
  event WithdrawLiquidity(address _liquidityHolder, uint256 _tokensToWithdraw, uint256 _newTotalLiquidity);
  event BuyPolicy(address _policyHolder, uint256 _coverTokens, uint256 _price, uint256 _newTotalCoverTokens);

  constructor(address _contract, IPolicyBookFabric.ContractType _contractType, address _daiAddr)
    ERC20("BridgeMutual Insurance", "bmiDAIx")
  {
    contractAddress = _contract;
    contractType = _contractType;
    daiAddr = _daiAddr;
  }

  receive() external payable {}

  function getContractAddress() external view override returns (address _contract) {
    _contract = contractAddress;
  }

  function getContractType() external view override returns (IPolicyBookFabric.ContractType _type) {
    _type = contractType;
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

  function addShieldTokens(address _tokenAddress, uint256 _tokensAmount) external override returns (bool _success) {
    return false;
  }

  function buyPolicy(
    uint256 _durationSeconds,
    uint256 _coverTokens,
    uint256 _maxDaiTokens
  ) external override {
    _buyPolicyFor(msg.sender, _durationSeconds, _coverTokens, _maxDaiTokens);
  }

  function buyPolicyFor(
    address _policyHolderAddr,
    uint256 _durationSeconds,
    uint256 _coverTokens,
    uint256 _maxDaiTokens
  ) external override {
    _buyPolicyFor(_policyHolderAddr, _durationSeconds, _coverTokens, _maxDaiTokens);
  }

  function _buyPolicyFor(
    address _policyHolderAddr,
    uint256 _durationSeconds,
    uint256 _coverTokens,
    uint256 _maxDaiTokens
  ) internal {
    PolicyHolder memory _policyHolder = policyHolders[_policyHolderAddr];
    require(_policyHolder.durationSeconds == 0, "The policy holder already exists");
    require(totalLiquidity >= totalCoverTokens.add(_coverTokens), "Not enough available liquidity");

    uint256 _price = _getQuote(_durationSeconds, _coverTokens);

    _policyHolder.coverTokens = _coverTokens;
    _policyHolder.durationSeconds = _durationSeconds;
    _policyHolder.maxDaiTokens = _maxDaiTokens;

    policyHolders[_policyHolderAddr] = _policyHolder;
    totalCoverTokens = totalCoverTokens.add(_coverTokens);

    IERC20 daiToken = IERC20(daiAddr);
    bool _success = daiToken.transferFrom(_policyHolderAddr, address(this), _price);
    require(_success, "Failed to transfer tokens");

    emit BuyPolicy(_policyHolderAddr, _coverTokens, _price, totalCoverTokens);
  }

  function addLiquidity(uint256 _liqudityAmount) external override {
    _addLiquidityFor(msg.sender, _liqudityAmount);
  }

  function addLiquidityFor(address _liquidityHolderAddr, uint256 _liqudityAmount) external override {
    _addLiquidityFor(_liquidityHolderAddr, _liqudityAmount);
  }

  function _addLiquidityFor(address _liquidityHolderAddr, uint256 _liqudityAmount) internal {
    LiquidityHolder memory _liquidityHolder = liquidityHolders[_liquidityHolderAddr];

    uint256 _calculatedInterest;
    if (_liquidityHolder.lastUpdate > 0) {
      _calculatedInterest = _calculateInterest(_liquidityHolderAddr);
    }

    uint256 _tokensToAdd = _liqudityAmount.add(_calculatedInterest);

    _liquidityHolder.depositedAmount = _liquidityHolder.depositedAmount.add(_tokensToAdd);
    _liquidityHolder.lastUpdate = block.timestamp;

    liquidityHolders[_liquidityHolderAddr] = _liquidityHolder;

    totalLiquidity = totalLiquidity.add(_tokensToAdd);

    IERC20 daiToken = IERC20(daiAddr);
    bool _success = daiToken.transferFrom(_liquidityHolderAddr, address(this), _liqudityAmount);
    require(_success, "Failed to transfer tokens");

    emit AddLiquidity(_liquidityHolderAddr, _liqudityAmount, totalLiquidity);
  }

  function withdrawLiquidity(uint256 _tokensToWithdraw) external override {
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

    IERC20 daiToken = IERC20(daiAddr);
    bool _success = daiToken.transfer(msg.sender, _tokensToWithdraw);
    require(_success, "Failed to transfer tokens");

    emit WithdrawLiquidity(msg.sender, _tokensToWithdraw, totalLiquidity);
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

  uint256 public constant SECONDS_IN_THE_YEAR = 365 * 24 * 60 * 60; // 365 days * 24 hours * 60 minutes * 60 seconds
  uint256 public constant PRECISION = 10**10;
  uint256 public constant PERCENTAGE_100 = 100 * PRECISION;

  uint256 public constant MINIMUM_COST_PERCENTAGE = 5 * PRECISION;
  uint256 public constant RISKY_ASSET_THRESHOLD_PERCENTAGE = 70 * PRECISION;
  uint256 public constant MAXIMUM_COST_NOT_RISKY_PERCENTAGE = 30 * PRECISION;
  uint256 public constant MAXIMUM_COST_100_UTILIZATION_PERCENTAGE = 150 * PRECISION;

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

  function getQuote(uint256 _durationSeconds, uint256 _tokens) external view override returns (uint256 _daiTokens) {
    _daiTokens = _getQuote(_durationSeconds, _tokens);
  }

  function _getQuote(uint256 _durationSeconds, uint256 _tokens) internal view returns (uint256) {
    require(totalCoverTokens.add(_tokens) <= totalLiquidity, "Requiring more than there exists");
    require(totalLiquidity > 0, "The pool is empty");

    uint256 utilizationRatioPercentage = ((totalCoverTokens.add(_tokens)).mul(PERCENTAGE_100)).div(totalLiquidity);

    uint256 annualInsuranceCostPercentage;

    if (utilizationRatioPercentage < RISKY_ASSET_THRESHOLD_PERCENTAGE) {
      annualInsuranceCostPercentage = calculateWhenNotRisky(utilizationRatioPercentage);
    } else {
      annualInsuranceCostPercentage = calculateWhenIsRisky(utilizationRatioPercentage);
    }

    annualInsuranceCostPercentage = Math.max(annualInsuranceCostPercentage, MINIMUM_COST_PERCENTAGE);

    uint256 actualInsuranceCostPercentage = 
      (_durationSeconds.mul(annualInsuranceCostPercentage)).div(SECONDS_IN_THE_YEAR);

    return (_tokens.mul(actualInsuranceCostPercentage)).div(PERCENTAGE_100);
  }
}
