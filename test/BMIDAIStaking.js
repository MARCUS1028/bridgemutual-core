const BMIDAIStaking = artifacts.require('BMIDAIStaking');
const DefiYieldGenerator = artifacts.require('DefiYieldGenerator');
const ContractsRegistry = artifacts.require('ContractsRegistry');
const PolicyBookFabric = artifacts.require('PolicyBookFabric');
const PolicyBookRegistry = artifacts.require('PolicyBookRegistry');
const PolicyBookMock = artifacts.require('./mock/PolicyBookMock');
const DAIMock = artifacts.require('./mock/DAIMock');
const BMIToken = artifacts.require('BMIToken');
const VestingContract = artifacts.require('BMITokenVesting');
const LiquidityMining = artifacts.require('LiquidityMining.sol');
const LiquidityMiningNFT = artifacts.require('LiquidityMiningNFT.sol');

const {assert} = require('chai');
const truffleAssert = require('truffle-assertions');
const setCurrentTime = require('./helpers/ganacheTimeTraveler');

const ContractType = {
  STABLECOIN: 0,
  DEFI: 1,
  CONTRACT: 2,
  EXCHANGE: 3,
};

contract('BMIDAIStaking', async (accounts) => {
  const MAIN = accounts[0];
  const HELP = accounts[1];

  let daiMock;
  let policyBook;
  let bmiDaiStaking;
  let defiYieldGenerator;

  beforeEach('setup', async () => {
    const mockInsuranceContractAddress1 = '0x0000000000000000000000000000000000000001';

    const contractsRegistry = await ContractsRegistry.new();
    const policyBookRegistry = await PolicyBookRegistry.new();
    const policyBookFabric = await PolicyBookFabric.new();
    const vesting = await VestingContract.new();
    const bmiToken = await BMIToken.new(vesting.address);
    const liquidityMiningNFT = await LiquidityMiningNFT.new('');
    const liquidityMining = await LiquidityMining.new();
    daiMock = await DAIMock.new('mockDAI', 'MDAI');
    bmiDaiStaking = await BMIDAIStaking.new();
    defiYieldGenerator = await DefiYieldGenerator.new();

    await vesting.setToken(bmiToken.address);

    await contractsRegistry.addContractRegistry(
      (await contractsRegistry.getDAIName.call()), daiMock.address);
    await contractsRegistry.addContractRegistry(
      (await contractsRegistry.getBMIName.call()), bmiToken.address);
    await contractsRegistry.addContractRegistry(
      (await contractsRegistry.getBMIDAIStakingName.call()), bmiDaiStaking.address);
    await contractsRegistry.addContractRegistry(
      (await contractsRegistry.getLiquidityMiningName.call()), liquidityMining.address);
    await contractsRegistry.addContractRegistry(
      (await contractsRegistry.getLiquidityMiningNFTName.call()), liquidityMiningNFT.address);
    await contractsRegistry.addContractRegistry(
      (await contractsRegistry.getYieldGeneratorName.call()), defiYieldGenerator.address);
    await contractsRegistry.addContractRegistry(
      (await contractsRegistry.getPolicyBookRegistryName.call()), policyBookRegistry.address);
    await contractsRegistry.addContractRegistry(
      (await contractsRegistry.getPolicyBookFabricName.call()), policyBookFabric.address);

    await liquidityMining.initRegistry(contractsRegistry.address);
    await policyBookFabric.initRegistry(contractsRegistry.address);
    await policyBookRegistry.initRegistry(contractsRegistry.address);
    await bmiDaiStaking.initRegistry(contractsRegistry.address);
    await defiYieldGenerator.initRegistry(contractsRegistry.address);

    await bmiDaiStaking.makeDefiYieldGeneratorApproveStakingWithdrowal();

    const policyBookAddress =
        (await policyBookFabric.create(mockInsuranceContractAddress1, ContractType.DEFI, 'mock1', '1')).logs[2].args.at;
    policyBook = await PolicyBookMock.at(policyBookAddress);

    const liquidity = 1000000;

    await daiMock.approve(policyBookAddress, liquidity);
    await policyBook.addLiquidity(liquidity);
  });

  describe('stakeDAIx', async () => {
    it('should fail due to insufficient balance', async () => {
      await truffleAssert.reverts(bmiDaiStaking.stakeDAIx(1000, policyBook.address, {from: HELP}),
        'ERC20: transfer amount exceeds balance');
    });

    it('should fail due to insufficient allowance', async () => {
      await truffleAssert.reverts(bmiDaiStaking.stakeDAIx(1000, policyBook.address),
        'ERC20: transfer amount exceeds allowance');
    });

    it('should mint new NFT', async () => {
      await policyBook.approve(bmiDaiStaking.address, 1000);

      const result = await bmiDaiStaking.stakeDAIx(1000, policyBook.address);

      assert.equal((await bmiDaiStaking.stakingInfoByToken(2)).stakedDaiAmount, 1000);
      assert.equal(await bmiDaiStaking.howManyStakings(MAIN), 1);
      assert.equal((await bmiDaiStaking.getStakingTokensByOwner(MAIN))[0], 2);
      assert.equal(await policyBook.balanceOfNFT(MAIN), 1);
      assert.equal(await policyBook.ownerOfNFT(2), MAIN);

      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].event, 'StakingNFTMinted');
      assert.equal(result.logs[0].args.id, 2);
      assert.equal(result.logs[0].args.policyBookAddress, policyBook.address);
      assert.equal(result.logs[0].args.to, MAIN);
    });

    it('should transfer DAI tokens to YieldGenerator', async () => {
      await policyBook.approve(bmiDaiStaking.address, 1000);

      assert.equal(await daiMock.balanceOf(defiYieldGenerator.address), 0);
      assert.equal(await daiMock.balanceOf(policyBook.address), 1000000);

      await bmiDaiStaking.stakeDAIx(1000, policyBook.address);

      assert.equal(await daiMock.balanceOf(defiYieldGenerator.address), 1000);
      assert.equal(await daiMock.balanceOf(policyBook.address), 999000);
    });

    it('should transfer BMIDAIx tokens to Staking', async () => {
      await policyBook.approve(bmiDaiStaking.address, 1000);

      assert.equal(await policyBook.balanceOf(bmiDaiStaking.address), 0);
      assert.equal(await policyBook.balanceOf(MAIN), 1000000);

      await bmiDaiStaking.stakeDAIx(1000, policyBook.address);

      assert.equal(await policyBook.balanceOf(bmiDaiStaking.address), 1000);
      assert.equal(await policyBook.balanceOf(MAIN), 999000);
    });

    it('should mint then burn then mint new ERC721', async () => {
      await policyBook.approve(bmiDaiStaking.address, 2000);

      let result = await bmiDaiStaking.stakeDAIx(1000, policyBook.address);

      assert.equal((await bmiDaiStaking.stakingInfoByToken(2)).stakedDaiAmount, 1000);
      assert.equal(await bmiDaiStaking.howManyStakings(MAIN), 1);
      assert.equal((await bmiDaiStaking.getStakingTokensByOwner(MAIN))[0], 2);
      assert.equal(await policyBook.balanceOfNFT(MAIN), 1);
      assert.equal(await policyBook.ownerOfNFT(2), MAIN);

      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].event, 'StakingNFTMinted');
      assert.equal(result.logs[0].args.id, 2);
      assert.equal(result.logs[0].args.policyBookAddress, policyBook.address);
      assert.equal(result.logs[0].args.to, MAIN);

      result = await bmiDaiStaking.stakeDAIx(1000, policyBook.address);

      assert.equal((await bmiDaiStaking.stakingInfoByToken(3)).stakedDaiAmount, 2000);
      await truffleAssert.reverts(bmiDaiStaking.stakingInfoByToken(2), 'Staking: this staking token doesn\'t exist');
      assert.equal(await bmiDaiStaking.howManyStakings(MAIN), 1);
      assert.equal((await bmiDaiStaking.getStakingTokensByOwner(MAIN))[0], 3);
      assert.equal(await policyBook.balanceOfNFT(MAIN), 1);
      assert.equal(await policyBook.ownerOfNFT(3), MAIN);

      assert.equal(result.logs.length, 2);

      assert.equal(result.logs[0].event, 'StakingNFTBurned');
      assert.equal(result.logs[0].args.id, 2);
      assert.equal(result.logs[0].args.policyBookAddress, policyBook.address);

      assert.equal(result.logs[1].event, 'StakingNFTMinted');
      assert.equal(result.logs[1].args.id, 3);
      assert.equal(result.logs[1].args.policyBookAddress, policyBook.address);
      assert.equal(result.logs[1].args.to, MAIN);
    });
  });

  describe('withdrawBMIProfit', async () => {
    it('should revert due to nonexistent token', async () => {
      await truffleAssert.reverts(bmiDaiStaking.withdrawBMIProfit(2), 'Staking: this staking token doesn\'t exist');
    });

    it('should revert due to different token ownership', async () => {
      await policyBook.approve(bmiDaiStaking.address, 1000);

      await bmiDaiStaking.stakeDAIx(1000, policyBook.address);

      await truffleAssert.reverts(bmiDaiStaking.withdrawBMIProfit(2, {from: HELP}), 'Staking: Not an NFT token owner');
    });

    it('should withdraw 0 BMI (MOCK)', async () => {
      await policyBook.approve(bmiDaiStaking.address, 1000);

      await bmiDaiStaking.stakeDAIx(1000, policyBook.address);

      const result = await bmiDaiStaking.withdrawBMIProfit(2);

      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].event, 'StakingBMIProfitWithdrawn');
      assert.equal(result.logs[0].args.id, 2);
      assert.equal(result.logs[0].args.amount, 0);
      assert.equal(result.logs[0].args.to, MAIN);
    });
  });

  describe('withdrawFundsWithProfit', async () => {
    it('should revert due to nonexistent token', async () => {
      await truffleAssert.reverts(bmiDaiStaking.withdrawFundsWithProfit(2),
        'Staking: this staking token doesn\'t exist');
    });

    it('should revert due to 3 month token lock', async () => {
      await setCurrentTime(1);

      await policyBook.approve(bmiDaiStaking.address, 1000);

      await bmiDaiStaking.stakeDAIx(1000, policyBook.address);

      await truffleAssert.reverts(bmiDaiStaking.withdrawFundsWithProfit(2), 'Staking: Funds are locked for 3 month');
    });

    it('should revert due to different token ownership', async () => {
      await setCurrentTime(1);

      await policyBook.approve(bmiDaiStaking.address, 1000);

      await bmiDaiStaking.stakeDAIx(1000, policyBook.address);

      await setCurrentTime(3 * 30 * 24 * 60 * 60 + 10); // 3 month + 10 seconds

      await truffleAssert.reverts(bmiDaiStaking.withdrawBMIProfit(2, {from: HELP}), 'Staking: Not an NFT token owner');
    });

    it('should withdraw funds, profit and burn NFT', async () => {
      await setCurrentTime(1);

      await policyBook.approve(bmiDaiStaking.address, 1000);

      assert.equal(await policyBook.balanceOf(bmiDaiStaking.address), 0);
      assert.equal(await policyBook.balanceOf(MAIN), 1000000);

      assert.equal(await daiMock.balanceOf(defiYieldGenerator.address), 0);
      assert.equal(await daiMock.balanceOf(policyBook.address), 1000000);

      await bmiDaiStaking.stakeDAIx(1000, policyBook.address);

      assert.equal(await policyBook.balanceOf(bmiDaiStaking.address), 1000);
      assert.equal(await policyBook.balanceOf(MAIN), 999000);

      assert.equal(await daiMock.balanceOf(defiYieldGenerator.address), 1000);
      assert.equal(await daiMock.balanceOf(policyBook.address), 999000);

      assert.equal((await bmiDaiStaking.stakingInfoByToken(2)).stakedDaiAmount, 1000);
      assert.equal(await bmiDaiStaking.howManyStakings(MAIN), 1);
      assert.equal((await bmiDaiStaking.getStakingTokensByOwner(MAIN))[0], 2);
      assert.equal(await policyBook.balanceOfNFT(MAIN), 1);
      assert.equal(await policyBook.ownerOfNFT(2), MAIN);

      await setCurrentTime(3 * 30 * 24 * 60 * 60 + 10); // 3 month + 10 seconds

      const result = await bmiDaiStaking.withdrawFundsWithProfit(2);

      assert.equal(await bmiDaiStaking.howManyStakings(MAIN), 0);
      assert.equal(await policyBook.balanceOfNFT(MAIN), 0);

      assert.equal(await policyBook.balanceOf(bmiDaiStaking.address), 0);
      assert.equal(await policyBook.balanceOf(MAIN), 1000000);

      assert.equal(await daiMock.balanceOf(defiYieldGenerator.address), 0);
      assert.equal(await daiMock.balanceOf(policyBook.address), 1000000);

      assert.equal(result.logs.length, 3);
      assert.equal(result.logs[0].event, 'StakingBMIProfitWithdrawn');
      assert.equal(result.logs[0].args.id, 2);
      assert.equal(result.logs[0].args.amount, 0);
      assert.equal(result.logs[0].args.to, MAIN);

      assert.equal(result.logs[1].event, 'StakingFundsWithdrawn');
      assert.equal(result.logs[1].args.id, 2);
      assert.equal(result.logs[1].args.to, MAIN);

      assert.equal(result.logs[2].event, 'StakingNFTBurned');
      assert.equal(result.logs[2].args.id, 2);
      assert.equal(result.logs[2].args.policyBookAddress, policyBook.address);
    });
  });
});
