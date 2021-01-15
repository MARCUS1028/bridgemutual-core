const PolicyBook = artifacts.require('PolicyBook');
const DAI = artifacts.require('DAIMock');

const Reverter = require('./helpers/reverter');
const BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');
const setCurrentTime = require('./helpers/ganacheTimeTraveler');
const {assert} = require('chai');

const ContractType = {
  STABLECOIN: 0,
  DEFI: 1,
  CONTRACT: 2,
  EXCHANGE: 3,
};

contract('PolicyBook', async (accounts) => {
  const reverter = new Reverter(web3);

  let policyBook;
  let dai;

  const BOOK = accounts[0];
  const USER1 = accounts[1];
  const USER2 = accounts[2];

  before('setup', async () => {
    dai = await DAI.new('dai', 'dai');
    policyBook = await PolicyBook.new(BOOK, ContractType.CONTRACT, dai.address);

    await reverter.snapshot();
  });

  afterEach('revert', reverter.revert);

  describe('buyPolicy', async () => {
    const daiAmount = toBN(10000);
    const liquidityAmount = toBN(5000);
    const durationDays = toBN(100);
    const coverTokensAmount = toBN(1000);
    const maxDaiTokens = toBN(500);
    const price = toBN(100);

    beforeEach('setup', async () => {
      await dai.transfer(USER1, daiAmount);
      await dai.approve(policyBook.address, daiAmount, {from: USER1});

      await dai.transfer(USER2, daiAmount)
      await dai.approve(policyBook.address, daiAmount, {from: USER2});

      await setCurrentTime(1);
      await policyBook.addLiquidity(liquidityAmount, {from: USER1});
      assert.equal(await policyBook.totalLiquidity(), liquidityAmount.toString());
      assert.equal(await dai.balanceOf(policyBook.address), liquidityAmount.toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(liquidityAmount).toString());
    });

    it('should set correct values', async () => {
      await policyBook.buyPolicy(durationDays, coverTokensAmount, maxDaiTokens, {from: USER2});

      assert.equal(await policyBook.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBook.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationDays, durationDays.toString());
      assert.equal(policyHolder.maxDaiTokens, maxDaiTokens.toString());

      assert.equal(await dai.balanceOf(policyBook.address), liquidityAmount.plus(price).toString());
      assert.equal(await dai.balanceOf(USER2), daiAmount.minus(price).toString());
    });

    it('should get exception, policy holder already exists', async () => {
      await policyBook.buyPolicy(durationDays, coverTokensAmount, maxDaiTokens, {from: USER2});

      assert.equal(await policyBook.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBook.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationDays, durationDays.toString());
      assert.equal(policyHolder.maxDaiTokens, maxDaiTokens.toString());

      assert.equal(await dai.balanceOf(policyBook.address), liquidityAmount.plus(price).toString());
      assert.equal(await dai.balanceOf(USER2), daiAmount.minus(price).toString());

      const reason = 'The policy holder already exists';
      await truffleAssert.reverts(policyBook.buyPolicy(durationDays, coverTokensAmount, maxDaiTokens, {from: USER2}),
        reason);
    });

    it('should get exception, not enough available liquidity', async () => {
      const reason = 'Not enough available liquidity';
      await truffleAssert.reverts(policyBook
      .buyPolicy(durationDays, coverTokensAmount.times(10), maxDaiTokens, {from: USER2}), reason);
    });
  });

  describe('buyPolicyFor', async () => {
    const daiAmount = toBN(10000);
    const liquidityAmount = toBN(5000);
    const durationDays = toBN(100);
    const coverTokensAmount = toBN(1000);
    const maxDaiTokens = toBN(500);
    const price = toBN(100);

    beforeEach('setup', async () => {
      await dai.transfer(USER1, daiAmount);
      await dai.approve(policyBook.address, daiAmount, {from: USER1});

      await dai.transfer(USER2, daiAmount)
      await dai.approve(policyBook.address, daiAmount, {from: USER2});
      
      await setCurrentTime(1);
      await policyBook.addLiquidity(liquidityAmount, {from: USER1});
      assert.equal(await policyBook.totalLiquidity(), liquidityAmount.toString());
      assert.equal(await dai.balanceOf(policyBook.address), liquidityAmount.toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(liquidityAmount).toString());
    });

    it('should set correct values', async () => {
      await policyBook.buyPolicyFor(USER2, durationDays, coverTokensAmount, maxDaiTokens);

      assert.equal(await policyBook.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBook.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationDays, durationDays.toString());
      assert.equal(policyHolder.maxDaiTokens, maxDaiTokens.toString());

      assert.equal(await dai.balanceOf(policyBook.address), liquidityAmount.plus(price).toString());
      assert.equal(await dai.balanceOf(USER2), daiAmount.minus(price).toString());
    });

    it('should get exception, policy holder already exists', async () => {
      await policyBook.buyPolicyFor(USER2, durationDays, coverTokensAmount, maxDaiTokens);

      assert.equal(await policyBook.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBook.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationDays, durationDays.toString());
      assert.equal(policyHolder.maxDaiTokens, maxDaiTokens.toString());

      assert.equal(await dai.balanceOf(policyBook.address), liquidityAmount.plus(price).toString());
      assert.equal(await dai.balanceOf(USER2), daiAmount.minus(price).toString());

      const reason = 'The policy holder already exists';
      await truffleAssert.reverts(policyBook.buyPolicyFor(USER2, durationDays, coverTokensAmount, maxDaiTokens),
        reason);
    });

    it('should get exception, not enough available liquidity', async () => {
      const reason = 'Not enough available liquidity';
      await truffleAssert.reverts(policyBook
      .buyPolicyFor(USER2, durationDays, coverTokensAmount.times(10), maxDaiTokens), reason);
    });
  });

  describe('addLiquidity', async () => {
    const daiAmount = toBN(10000);
    const amount = toBN(1000);

    beforeEach('setup', async () => {
      await dai.transfer(USER1, daiAmount);
      await dai.approve(policyBook.address, daiAmount, {from: USER1});
    });

    it('should set correct values', async () => {
      await setCurrentTime(1);
      await policyBook.addLiquidity(amount, {from: USER1});

      assert.equal(await policyBook.totalLiquidity(), amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).depositedAmount, amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).lastUpdate, 1);
      assert.equal(await dai.balanceOf(policyBook.address), amount.toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(amount).toString());
    });

    it('should update the values correctly', async () => {
      await setCurrentTime(1);
      await policyBook.addLiquidity(amount, {from: USER1});

      assert.equal(await policyBook.totalLiquidity(), amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).depositedAmount, amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).lastUpdate, 1);
      assert.equal(await dai.balanceOf(policyBook.address), amount.toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(amount).toString());

      await setCurrentTime(100);
      await policyBook.addLiquidity(amount, {from: USER1});

      assert.equal(await policyBook.totalLiquidity(), amount.times(2).toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).depositedAmount, amount.times(2).toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).lastUpdate, 100);
      assert.equal(await dai.balanceOf(policyBook.address), amount.times(2).toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(amount.times(2)).toString());
    });
  });

  describe('addLiquidityFor', async () => {
    const daiAmount = toBN(10000);
    const amount = toBN(1000);

    beforeEach('setup', async () => {
      await dai.transfer(USER1, daiAmount);
      await dai.approve(policyBook.address, daiAmount, {from: USER1});
    });

    it('should set correct values', async () => {
      await setCurrentTime(1);
      await policyBook.addLiquidityFor(USER1, amount);

      assert.equal(await policyBook.totalLiquidity(), amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).depositedAmount, amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).lastUpdate, 1);
      assert.equal(await dai.balanceOf(policyBook.address), amount.toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(amount).toString());
    });

    it('should update the values correctly', async () => {
      await setCurrentTime(1);
      await policyBook.addLiquidityFor(USER1, amount);

      assert.equal(await policyBook.totalLiquidity(), amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).depositedAmount, amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).lastUpdate, 1);
      assert.equal(await dai.balanceOf(policyBook.address), amount.toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(amount).toString());

      await setCurrentTime(100);
      await policyBook.addLiquidityFor(USER1, amount);

      assert.equal(await policyBook.totalLiquidity(), amount.times(2).toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).depositedAmount, amount.times(2).toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).lastUpdate, 100);
      assert.equal(await dai.balanceOf(policyBook.address), amount.times(2).toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(amount.times(2)).toString());
    });
  });

  describe('withdrawLiquidity', async () => {
    const daiAmount = toBN(10000);
    const liquidityAmount = toBN(5000);
    const coverTokensAmount = toBN(3000);
    const amountToWithdraw = toBN(1000);
    const price = toBN(100);

    beforeEach('setup', async () => {
      await dai.transfer(USER1, daiAmount);
      await dai.approve(policyBook.address, daiAmount, {from: USER1});

      await dai.transfer(USER2, daiAmount);
      await dai.approve(policyBook.address, daiAmount, {from: USER2});
    });

    it('should successfully withdraw tokens', async () => {
      await setCurrentTime(1);
      await policyBook.addLiquidity(liquidityAmount, {from: USER1});
      assert.equal(await policyBook.totalLiquidity(), liquidityAmount.toString());

      await policyBook.buyPolicy(1, coverTokensAmount, 10, {from: USER2});
      assert.equal(await policyBook.totalCoverTokens(), coverTokensAmount.toString());

      assert.equal(await dai.balanceOf(policyBook.address), liquidityAmount.plus(price).toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(liquidityAmount).toString());

      await setCurrentTime(10);
      await policyBook.withdrawLiquidity(amountToWithdraw, {from: USER1});
      assert.equal(toBN(await policyBook.totalLiquidity()).toString(),
        liquidityAmount.minus(amountToWithdraw).toString());

      assert.equal((await policyBook.liquidityHolders(USER1)).depositedAmount,
        liquidityAmount.minus(amountToWithdraw).toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).lastUpdate, 10);

      assert.equal(await dai.balanceOf(policyBook.address),
        liquidityAmount.plus(price).minus(amountToWithdraw).toString());
      assert.equal(await dai.balanceOf(USER1),
        daiAmount.minus(liquidityAmount).plus(amountToWithdraw).toString());
    });

    it('should get exception, amount to be withdrawn is greater than the deposited amount', async () => {
      await setCurrentTime(1);
      await policyBook.addLiquidity(liquidityAmount, {from: USER1});
      assert.equal(toBN(await policyBook.totalLiquidity()).toString(), liquidityAmount.toString());

      const reason = 'The amount to be withdrawn is greater than the deposited amount';
      await truffleAssert.reverts(policyBook.withdrawLiquidity(amountToWithdraw.times(10), {from: USER1}), reason);
    });

    it('should get exception, not enough available liquidity', async () => {
      await setCurrentTime(1);
      await policyBook.addLiquidity(liquidityAmount, {from: USER1});
      assert.equal(toBN(await policyBook.totalLiquidity()).toString(), liquidityAmount.toString());

      await policyBook.buyPolicy(1, coverTokensAmount, 10, {from: USER2});
      assert.equal(toBN(await policyBook.totalCoverTokens()).toString(), coverTokensAmount.toString());

      const reason = 'Not enough available liquidity';
      await truffleAssert.reverts(policyBook.withdrawLiquidity(amountToWithdraw.times(3), {from: USER1}), reason);
    });

    it('should get exception, liquidity holder does not exist', async () => {
      const reason = 'Liquidity holder does not exists';
      await truffleAssert.reverts(policyBook.withdrawLiquidity(amountToWithdraw, {from: USER1}), reason);
    });
  });
});

function toBN(number) {
  return new BigNumber(number);
}
