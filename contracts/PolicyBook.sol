// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";

import "./interfaces/IPolicyBook.sol";
import "./interfaces/IPolicyBookFabric.sol";

import "./LiquidityMining.sol";
import "./ContractsRegistry.sol";
import "./tokens/ERC1155UltraNFTMintableBurnable.sol";

contract PolicyBook is IPolicyBook, ERC1155UltraNFTMintableBurnable {
  using SafeMath for uint256;
  using Math for uint256;

  uint256 constant private MAX_INT = 2**256 - 1;

  ContractsRegistry public contractsRegistry;

  address public override insuranceContractAddress;

  IPolicyBookFabric.ContractType public override contractType;
  
  IERC20 public daiToken;
  address public bmiDaiStakingAddress;
  LiquidityMining public liquidityMining;

  uint256 public totalLiquidity;
  uint256 public totalCoverTokens;  

  struct PolicyHolder {
    uint256 coverTokens;
    uint256 durationSeconds;    
  }

  mapping(address => PolicyHolder) public policyHolders;
  mapping(address => uint256) public liquidityFromLM;

  event AddLiquidity(address _liquidityHolder, uint256 _liqudityAmount, uint256 _newTotalLiquidity);
  event WithdrawLiquidity(address _liquidityHolder, uint256 _tokensToWithdraw, uint256 _newTotalLiquidity);
  event BuyPolicy(address _policyHolder, uint256 _coverTokens, uint256 _price, uint256 _newTotalCoverTokens);

  modifier onlyLiquidityMining() {
    require(msg.sender == address(liquidityMining),
      "The caller does not have access, only liquidity mining has");
    _;
  }

  constructor(    
    address _insuranceContract,
    IPolicyBookFabric.ContractType _contractType,    
    string memory _description,
    string memory _projectSymbol
  ) ERC1155UltraNFTMintableBurnable(_description, string(abi.encodePacked("bmiDAI", _projectSymbol))) {    
    insuranceContractAddress = _insuranceContract;
    contractType = _contractType;       
  }

  function initRegistry(ContractsRegistry _contractsRegistry) external onlyOwner {
    contractsRegistry = _contractsRegistry;
    
    daiToken = IERC20(_contractsRegistry.getContract(_contractsRegistry.getDAIName()));
    bmiDaiStakingAddress = contractsRegistry.getContract(contractsRegistry.getBMIDAIStakingName()); 
    liquidityMining = LiquidityMining(contractsRegistry.getContract(contractsRegistry.getLiquidityMiningName()));
  }  

  function approveAllDaiTokensForStakingAndTransferOwnership() external onlyOwner {
    bool _success = daiToken.approve(bmiDaiStakingAddress, MAX_INT);
    require(_success, "Failed to approve DAI tokens");

    transferOwnership(bmiDaiStakingAddress);
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
    uint256 _coverTokens   
  ) external override {
    _buyPolicyFor(msg.sender, _durationSeconds, _coverTokens);
  }

  function buyPolicyFor(
    address _policyHolderAddr,
    uint256 _durationSeconds,
    uint256 _coverTokens    
  ) external override {
    _buyPolicyFor(_policyHolderAddr, _durationSeconds, _coverTokens);
  }

  function _buyPolicyFor(
    address _policyHolderAddr,
    uint256 _durationSeconds,
    uint256 _coverTokens
  ) internal {
    PolicyHolder memory _policyHolder = policyHolders[_policyHolderAddr];
    require(_policyHolder.durationSeconds == 0, "The policy holder already exists");
    require(totalLiquidity >= totalCoverTokens.add(_coverTokens), "Not enough available liquidity");

    uint256 _price = _getQuote(_durationSeconds, _coverTokens);

    _policyHolder.coverTokens = _coverTokens;
    _policyHolder.durationSeconds = _durationSeconds;    

    policyHolders[_policyHolderAddr] = _policyHolder;
    totalCoverTokens = totalCoverTokens.add(_coverTokens);

    bool _success = daiToken.transferFrom(_policyHolderAddr, address(this), _price);
    require(_success, "Failed to transfer DAI tokens");

    emit BuyPolicy(_policyHolderAddr, _coverTokens, _price, totalCoverTokens);
  }

  function addLiquidity(uint256 _liqudityAmount) external override {
    _addLiquidityFor(msg.sender, _liqudityAmount, false);
  }

  function addLiquidityFromLM(
    address _liquidityHolderAddr, 
    uint256 _liqudityAmount
  ) onlyLiquidityMining external override {
    _addLiquidityFor(_liquidityHolderAddr, _liqudityAmount, true);
  }

  function addLiquidityFor(address _liquidityHolderAddr, uint256 _liqudityAmount) external override {
    _addLiquidityFor(_liquidityHolderAddr, _liqudityAmount, false);
  }

  function _addLiquidityFor(address _liquidityHolderAddr, uint256 _liqudityAmount, bool _isLM) internal {
    bool _success = daiToken.transferFrom(_liquidityHolderAddr, address(this), _liqudityAmount);
    require(_success, "Failed to transfer DAI tokens");

    totalLiquidity = totalLiquidity.add(_liqudityAmount);
    _mintERC20(_liquidityHolderAddr, _liqudityAmount);

    if (_isLM) {
      liquidityFromLM[_liquidityHolderAddr] = liquidityFromLM[_liquidityHolderAddr].add(_liqudityAmount);
    }

    emit AddLiquidity(_liquidityHolderAddr, _liqudityAmount, totalLiquidity);
  }

  function withdrawLiquidity(uint256 _tokensToWithdraw) external override {
    uint256 _availableBalance = balanceOf(msg.sender);

    if (block.timestamp < liquidityMining.getEndLMTime()) {
      _availableBalance = _availableBalance.sub(liquidityFromLM[msg.sender]);
    }

    require(_availableBalance >= _tokensToWithdraw,
      "The amount to be withdrawn is greater than the available amount");
    require(totalLiquidity.sub(_tokensToWithdraw) >= totalCoverTokens, 
      "Not enough liquidity available");

    bool _success = daiToken.transfer(msg.sender, _tokensToWithdraw);
    require(_success, "Failed to transfer DAI tokens");

    totalLiquidity = totalLiquidity.sub(_tokensToWithdraw);
    _burnERC20(msg.sender, _tokensToWithdraw);

    emit WithdrawLiquidity(msg.sender, _tokensToWithdraw, totalLiquidity);
  }

  function _calculateInterest(address _policyHolder) internal view returns (uint256) {
    return 0;
  }

  function rewardForUnclaimedExpiredPolicy(uint256 _policyId) external override {}

  function stats()
    external
    view
    override
    returns (
      string memory _name,
      address _insuredContract,
      IPolicyBookFabric.ContractType _contractType,
      uint256 _maxCapacities,
      uint256 _totalDaiLiquidity,
      uint256 _annualProfitYields      
    )
  {
    // TODO APY
    return (
      name, 
      insuranceContractAddress,
      contractType, 
      totalLiquidity - totalCoverTokens, 
      totalLiquidity, 
      0
    );
  }

  uint256 public constant SECONDS_IN_THE_YEAR = 365 * 24 * 60 * 60; // 365 days * 24 hours * 60 minutes * 60 seconds
  uint256 public constant PRECISION = 10**25;
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
