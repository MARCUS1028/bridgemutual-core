const PolicyBook = artifacts.require('./Mock/MockPolicyBook');
const DAI = artifacts.require('./Mock/DAIMock');

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
    const durationSeconds = toBN(100).times(24).times(60).times(60);
    const coverTokensAmount = toBN(1000);
    const maxDaiTokens = toBN(500);
    let price;

    beforeEach('setup', async () => {
      await dai.transfer(USER1, daiAmount);
      await dai.approve(policyBook.address, daiAmount, {from: USER1});

      await dai.transfer(USER2, daiAmount);
      await dai.approve(policyBook.address, daiAmount, {from: USER2});

      await setCurrentTime(1);
      await policyBook.addLiquidity(liquidityAmount, {from: USER1});
      assert.equal(await policyBook.totalLiquidity(), liquidityAmount.toString());
      assert.equal(await dai.balanceOf(policyBook.address), liquidityAmount.toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(liquidityAmount).toString());
      price = toBN(await policyBook.getQuote(durationSeconds, coverTokensAmount));
    });

    it('should set correct values', async () => {
      await policyBook.buyPolicy(durationSeconds, coverTokensAmount, maxDaiTokens, {from: USER2});

      assert.equal(await policyBook.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBook.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationSeconds, durationSeconds.toString());
      assert.equal(policyHolder.maxDaiTokens, maxDaiTokens.toString());

      assert.equal(toBN(await dai.balanceOf(policyBook.address)).toString(), liquidityAmount.plus(price).toString());
      assert.equal(await dai.balanceOf(USER2), daiAmount.minus(price).toString());
    });

    it('should get exception, policy holder already exists', async () => {
      await policyBook.buyPolicy(durationSeconds, coverTokensAmount, maxDaiTokens, {from: USER2});

      assert.equal(await policyBook.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBook.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationSeconds, durationSeconds.toString());
      assert.equal(policyHolder.maxDaiTokens, maxDaiTokens.toString());

      assert.equal(toBN(await dai.balanceOf(policyBook.address)).toString(), liquidityAmount.plus(price).toString());
      assert.equal(await dai.balanceOf(USER2), daiAmount.minus(price).toString());

      const reason = 'The policy holder already exists';
      await truffleAssert.reverts(policyBook.buyPolicy(durationSeconds, coverTokensAmount, maxDaiTokens, {from: USER2}),
        reason);
    });

    it('should get exception, not enough available liquidity', async () => {
      const reason = 'Not enough available liquidity';
      await truffleAssert.reverts(policyBook
      .buyPolicy(durationSeconds, coverTokensAmount.times(10), maxDaiTokens, {from: USER2}), reason);
    });
  });

  describe('buyPolicyFor', async () => {
    const daiAmount = toBN(10000);
    const liquidityAmount = toBN(5000);
    const durationSeconds = toBN(100).times(24).times(60).times(60);
    const coverTokensAmount = toBN(1000);
    const maxDaiTokens = toBN(500);
    let price;

    beforeEach('setup', async () => {
      await dai.transfer(USER1, daiAmount);
      await dai.approve(policyBook.address, daiAmount, {from: USER1});

      await dai.transfer(USER2, daiAmount);
      await dai.approve(policyBook.address, daiAmount, {from: USER2});

      await setCurrentTime(1);
      await policyBook.addLiquidity(liquidityAmount, {from: USER1});
      assert.equal(await policyBook.totalLiquidity(), liquidityAmount.toString());
      assert.equal(await dai.balanceOf(policyBook.address), liquidityAmount.toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(liquidityAmount).toString());
      price = toBN(await policyBook.getQuote(durationSeconds, coverTokensAmount));
    });

    it('should set correct values', async () => {
      await policyBook.buyPolicyFor(USER2, durationSeconds, coverTokensAmount, maxDaiTokens);

      assert.equal(await policyBook.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBook.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationSeconds, durationSeconds.toString());
      assert.equal(policyHolder.maxDaiTokens, maxDaiTokens.toString());

      assert.equal(toBN(await dai.balanceOf(policyBook.address)).toString(), liquidityAmount.plus(price).toString());
      assert.equal(await dai.balanceOf(USER2), daiAmount.minus(price).toString());
    });

    it('should get exception, policy holder already exists', async () => {
      await policyBook.buyPolicyFor(USER2, durationSeconds, coverTokensAmount, maxDaiTokens);

      assert.equal(await policyBook.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBook.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationSeconds, durationSeconds.toString());
      assert.equal(policyHolder.maxDaiTokens, maxDaiTokens.toString());

      assert.equal(toBN(await dai.balanceOf(policyBook.address)).toString(), liquidityAmount.plus(price).toString());
      assert.equal(await dai.balanceOf(USER2), daiAmount.minus(price).toString());

      const reason = 'The policy holder already exists';
      await truffleAssert.reverts(policyBook.buyPolicyFor(USER2, durationSeconds, coverTokensAmount, maxDaiTokens),
        reason);
    });

    it('should get exception, not enough available liquidity', async () => {
      const reason = 'Not enough available liquidity';
      await truffleAssert.reverts(policyBook
      .buyPolicyFor(USER2, durationSeconds, coverTokensAmount.times(10), maxDaiTokens), reason);
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
    const durationSeconds = toBN(100).times(24).times(60).times(60);
    let price;

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

      price = toBN(await policyBook.getQuote(durationSeconds, coverTokensAmount));

      await policyBook.buyPolicy(durationSeconds, coverTokensAmount, 10, {from: USER2});
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

  describe('getQuote', async () => {
    let seconds;
    let myMoney;
    let total;
    let bought;

    it('calculating annual cost where UR = 51% < RISKY, (doc example 1)', async () => {
      seconds = 365 * 24 * 60 * 60;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await policyBook.setTotalLiquidity(total);
      await policyBook.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBook.getQuote(seconds, myMoney));

      assert.equal(calculatedPrice.toString(), toBN(21857).toString(), 'UR < RISKY case is incorrect');
    });

    it('calculating annual cost where UR = 90% > RISKY, (doc example 2)', async () => {
      seconds = 365 * 24 * 60 * 60;
      myMoney = 4000000; // 4mil
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await policyBook.setTotalLiquidity(total);
      await policyBook.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBook.getQuote(seconds, myMoney));

      assert.equal(calculatedPrice.toString(), toBN(4399999), 'UR > RISKY case is incorrect');
    });

    it('calculating annual cost where UR = 6% < RISKY, (doc example 3)', async () => {
      seconds = 365 * 24 * 60 * 60;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 500000; // 500k

      await policyBook.setTotalLiquidity(total);
      await policyBook.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBook.getQuote(seconds, myMoney));

      assert.equal(calculatedPrice.toString(), toBN(5000), 'UR < RISKY case is incorrect');
    });

    it('calculating 100 days cost where UR = 51% < RISKY', async () => {
      seconds = 100 * 24 * 60 * 60;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await policyBook.setTotalLiquidity(total);
      await policyBook.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBook.getQuote(seconds, myMoney));
      const expectedPrice = toBN(21857).times(seconds).idiv(365 * 24 * 60 * 60);
      assert.equal(calculatedPrice.toString(), expectedPrice.toString(), 'UR < RISKY case is incorrect');
    });

    it('calculating 1 day cost where UR = 51% < RISKY', async () => {
      seconds = 24 * 60 * 60;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await policyBook.setTotalLiquidity(total);
      await policyBook.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBook.getQuote(seconds, myMoney));
      const expectedPrice = toBN(21857).times(seconds).idiv(365 * 24 * 60 * 60);
      assert.equal(calculatedPrice.toString(), expectedPrice.toString(), 'UR < RISKY case is incorrect');
    });

    it('calculating 999 days cost where UR = 51% < RISKY', async () => {
      seconds = 999 * 24 * 60 * 60;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await policyBook.setTotalLiquidity(total);
      await policyBook.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBook.getQuote(seconds, myMoney));
      const expectedPrice = toBN(21857).times(seconds).idiv(365 * 24 * 60 * 60);
      assert.equal(calculatedPrice.toString(), expectedPrice.toString(), 'UR < RISKY case is incorrect');
    });

    it('calculating 0 seconds cost', async () => {
      seconds = 0;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await policyBook.setTotalLiquidity(total);
      await policyBook.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBook.getQuote(seconds, myMoney));
      assert.equal(calculatedPrice.toString(), 0, 'No matter what it should equal to 0');
    });

    it('calculating annual cost, forcing minimal percentage threshold', async () => {
      seconds = 365 * 24 * 60 * 60;
      myMoney = 100; // 100
      total = 10000000; // 10mil
      bought = 0; // 0

      await policyBook.setTotalLiquidity(total);
      await policyBook.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBook.getQuote(seconds, myMoney));
      const expectedPrice = toBN(5);
      assert.equal(calculatedPrice.toString(), expectedPrice.toString(), 'Less than minimal');
    });

    it('calculating 10 years cost where UR = 51% < RISKY + really big money', async () => {
      seconds = toBN(365).times(10).times(24).times(60).times(60); // 10 years
      myMoney = toBN(10).pow(12); // 1tril
      total = toBN(10).pow(14); // 100tril
      bought = toBN(10).pow(13).times(5); // 50tril

      await policyBook.setTotalLiquidity(total);
      await policyBook.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBook.getQuote(seconds, myMoney));
      const expectedPrice = toBN(2185714285710);
      assert.equal(calculatedPrice.toString(), expectedPrice.toString(), 'UR < RISKY case is incorrect');
    });

    it('edge case: calculating annual cost where UR = 100% > RISKY', async () => {
      seconds = 365 * 24 * 60 * 60;
      myMoney = 500000; // 500k
      total = 1000000; // 1mil
      bought = 500000; // 500k

      await policyBook.setTotalLiquidity(total);
      await policyBook.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBook.getQuote(seconds, myMoney));
      assert.equal(calculatedPrice, 750000, 'UR > RISKY case is incorrect');
    });

    it('require more tokens than there exists (should revert)', async () => {
      seconds = 365 * 24 * 60 * 60;
      myMoney = 600000; // 600k
      total = 1000000; // 1mil
      bought = 500000; // 500k

      await policyBook.setTotalLiquidity(total);
      await policyBook.setTotalCoverTokens(bought);

      await truffleAssert.reverts(policyBook.getQuote(seconds, myMoney),
        'Requiring more than there exists');
    });

    it('pool is empty (should revert)', async () => {
      seconds = 365 * 24 * 60 * 60;
      myMoney = 0; // 0
      total = 0; // 0
      bought = 0; // 0

      await policyBook.setTotalLiquidity(total);
      await policyBook.setTotalCoverTokens(bought);

      await truffleAssert.reverts(policyBook.getQuote(seconds, myMoney),
        'The pool is empty');
    });

    it("forcing overflow (should revert)", async () => {
      seconds = 365 * 24 * 60 * 60;
      myMoney = toBN(4).times(toBN(10).pow(toBN(76)));
      total = toBN(10).times(toBN(10).pow(toBN(76)));
      bought = toBN(5).times(toBN(10).pow(toBN(76)));

      await policyBook.setTotalLiquidity(total);
      await policyBook.setTotalCoverTokens(bought);

      await truffleAssert.reverts(policyBook.getQuote(seconds, myMoney), "SafeMath: multiplication overflow");
    });
  });
});

function toBN(number) {
  return new BigNumber(number);
}
