const PolicyBook = artifacts.require('PolicyBook');

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

  const BOOK = accounts[0];
  const USER1 = accounts[1];
  const USER2 = accounts[2];

  before('setup', async () => {
    policyBook = await PolicyBook.new(BOOK, ContractType.CONTRACT);

    await reverter.snapshot();
  });

  afterEach('revert', reverter.revert);

  describe('buyPolicy', async () => {
    const liquidityAmount = toBN(5000);
    const durationDays = toBN(100);
    const coverTokensAmount = toBN(1000);
    const maxDaiTokens = toBN(500);

    beforeEach('setup', async () => {
      await setCurrentTime(1);
      await policyBook.addLiquidity(liquidityAmount, {from: USER1});
      assert.equal(await policyBook.totalLiquidity(), liquidityAmount.toString());
    });

    it('should set correct values', async () => {
      await policyBook.buyPolicy(durationDays, coverTokensAmount, maxDaiTokens, {from: USER2});

      assert.equal(await policyBook.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBook.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationDays, durationDays.toString());
      assert.equal(policyHolder.maxDaiTokens, maxDaiTokens.toString());
    });

    it('should get exception, policy holder already exists', async () => {
      await policyBook.buyPolicy(durationDays, coverTokensAmount, maxDaiTokens, {from: USER2});

      assert.equal(await policyBook.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBook.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationDays, durationDays.toString());
      assert.equal(policyHolder.maxDaiTokens, maxDaiTokens.toString());

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
    const liquidityAmount = toBN(5000);
    const durationDays = toBN(100);
    const coverTokensAmount = toBN(1000);
    const maxDaiTokens = toBN(500);

    beforeEach('setup', async () => {
      await setCurrentTime(1);
      await policyBook.addLiquidity(liquidityAmount, {from: USER1});
      assert.equal(await policyBook.totalLiquidity(), liquidityAmount.toString());
    });

    it('should set correct values', async () => {
      await policyBook.buyPolicyFor(USER2, durationDays, coverTokensAmount, maxDaiTokens);

      assert.equal(await policyBook.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBook.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationDays, durationDays.toString());
      assert.equal(policyHolder.maxDaiTokens, maxDaiTokens.toString());
    });

    it('should get exception, policy holder already exists', async () => {
      await policyBook.buyPolicyFor(USER2, durationDays, coverTokensAmount, maxDaiTokens);

      assert.equal(await policyBook.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBook.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationDays, durationDays.toString());
      assert.equal(policyHolder.maxDaiTokens, maxDaiTokens.toString());

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
    const amount = toBN(1000);

    it('should set correct values', async () => {
      await setCurrentTime(1);
      await policyBook.addLiquidity(amount, {from: USER1});

      assert.equal(await policyBook.totalLiquidity(), amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).depositedAmount, amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).lastUpdate, 1);
    });

    it('should update the values correctly', async () => {
      await setCurrentTime(1);
      await policyBook.addLiquidity(amount, {from: USER1});

      assert.equal(await policyBook.totalLiquidity(), amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).depositedAmount, amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).lastUpdate, 1);

      await setCurrentTime(100);
      await policyBook.addLiquidity(amount, {from: USER2});

      assert.equal(await policyBook.totalLiquidity(), amount.times(2).toString());
      assert.equal((await policyBook.liquidityHolders(USER2)).depositedAmount, amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER2)).lastUpdate, 100);
    });
  });

  describe('addLiquidityFor', async () => {
    const amount = toBN(1000);

    it('should set correct values', async () => {
      await setCurrentTime(1);
      await policyBook.addLiquidityFor(USER1, amount);

      assert.equal(await policyBook.totalLiquidity(), amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).depositedAmount, amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).lastUpdate, 1);
    });

    it('should update the values correctly', async () => {
      await setCurrentTime(1);
      await policyBook.addLiquidityFor(USER1, amount);

      assert.equal(await policyBook.totalLiquidity(), amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).depositedAmount, amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).lastUpdate, 1);

      await setCurrentTime(100);
      await policyBook.addLiquidityFor(USER2, amount);

      assert.equal(await policyBook.totalLiquidity(), amount.times(2).toString());
      assert.equal((await policyBook.liquidityHolders(USER2)).depositedAmount, amount.toString());
      assert.equal((await policyBook.liquidityHolders(USER2)).lastUpdate, 100);
    });
  });

  describe('withdrawLiquidity', async () => {
    const liquidityAmount = toBN(5000);
    const coverTokensAmount = toBN(3000);
    const amountToWithdraw = toBN(1000);

    it('should successfully withdraw tokens', async () => {
      await setCurrentTime(1);
      await policyBook.addLiquidity(liquidityAmount, {from: USER1});
      assert.equal(await policyBook.totalLiquidity(), liquidityAmount.toString());

      await policyBook.buyPolicy(1, coverTokensAmount, 10, {from: USER2});
      assert.equal(await policyBook.totalCoverTokens(), coverTokensAmount.toString());

      await setCurrentTime(10);
      await policyBook.withdrawLiquidity(amountToWithdraw, {from: USER1});
      assert.equal(toBN(await policyBook.totalLiquidity()).toString(),
        liquidityAmount.minus(amountToWithdraw).toString());

      assert.equal((await policyBook.liquidityHolders(USER1)).depositedAmount,
        liquidityAmount.minus(amountToWithdraw).toString());
      assert.equal((await policyBook.liquidityHolders(USER1)).lastUpdate, 10);
    });

    it('should get exception, liquidity holder does not exist', async () => {
      await setCurrentTime(1);
      await policyBook.addLiquidity(liquidityAmount, {from: USER1});
      assert.equal(toBN(await policyBook.totalLiquidity()).toString(), liquidityAmount.toString());

      const reason = 'The amount to be withdrawn is greater than the deposited amount';
      await truffleAssert.reverts(policyBook.withdrawLiquidity(amountToWithdraw.times(10), {from: USER1}), reason);
    });

    it('should get exception, amount to be withdrawn is greater than the deposited amount', async () => {
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
