const PolicyBookMock = artifacts.require('./mock/PolicyBookMock');
const DAIMock = artifacts.require('./mock/DAIMock');
const ContractsRegistry = artifacts.require('ContractsRegistry');
const BmiDAIStaking = artifacts.require('BmiDAIStaking');

const Reverter = require('./helpers/reverter');
const BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');
const setCurrentTime = require('./helpers/ganacheTimeTraveler');

const ContractType = {
  STABLECOIN: 0,
  DEFI: 1,
  CONTRACT: 2,
  EXCHANGE: 3,
};

contract('PolicyBook', async (accounts) => {
  const reverter = new Reverter(web3);

  let bmiDaiStaking;
  let policyBookMock;
  let dai;

  const insuranceContract = accounts[0];
  const USER1 = accounts[1];
  const USER2 = accounts[2];

  let contractsRegistry;

  before('setup', async () => {
    contractsRegistry = await ContractsRegistry.new();
    dai = await DAIMock.new('dai', 'dai');
    bmiDaiStaking = await BmiDAIStaking.new();

    await contractsRegistry.addContractRegistry(
      (await contractsRegistry.getDAIName.call()), dai.address);
    await contractsRegistry.addContractRegistry(
      (await contractsRegistry.getBmiDAIStakingName.call()), bmiDaiStaking.address);

    policyBookMock = await PolicyBookMock.new(insuranceContract, ContractType.CONTRACT);
    await policyBookMock.initRegistry(contractsRegistry.address);

    await reverter.snapshot();
  });

  afterEach('revert', reverter.revert);

  describe('buyPolicy', async () => {
    const daiAmount = toBN(10000);
    const liquidityAmount = toBN(5000);
    const durationSeconds = toBN(100).times(24).times(60).times(60);
    const coverTokensAmount = toBN(1000);
    let price;

    beforeEach('setup', async () => {
      await dai.transfer(USER1, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER1});

      await dai.transfer(USER2, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER2});

      await setCurrentTime(1);
      await policyBookMock.addLiquidity(liquidityAmount, {from: USER1});
      assert.equal(await policyBookMock.totalLiquidity(), liquidityAmount.toString());
      assert.equal(await dai.balanceOf(policyBookMock.address), liquidityAmount.toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(liquidityAmount).toString());
      price = toBN(await policyBookMock.getQuote(durationSeconds, coverTokensAmount));
    });

    it('should set correct values', async () => {
      await policyBookMock.buyPolicy(durationSeconds, coverTokensAmount, {from: USER2});

      assert.equal(await policyBookMock.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBookMock.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationSeconds, durationSeconds.toString());

      assert.equal(toBN(await dai.balanceOf(policyBookMock.address)).toString(),
        liquidityAmount.plus(price).toString());
      assert.equal(await dai.balanceOf(USER2),
        daiAmount.minus(price).toString());
    });

    it('should get exception, policy holder already exists', async () => {
      await policyBookMock.buyPolicy(durationSeconds, coverTokensAmount, {from: USER2});

      assert.equal(await policyBookMock.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBookMock.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationSeconds, durationSeconds.toString());

      assert.equal(toBN(await dai.balanceOf(policyBookMock.address)).toString(),
        liquidityAmount.plus(price).toString());
      assert.equal(await dai.balanceOf(USER2),
        daiAmount.minus(price).toString());

      const reason = 'The policy holder already exists';
      await truffleAssert.reverts(policyBookMock.buyPolicy(durationSeconds, coverTokensAmount, {from: USER2}),
        reason);
    });

    it('should get exception, not enough available liquidity', async () => {
      const reason = 'Not enough available liquidity';
      await truffleAssert.reverts(policyBookMock
      .buyPolicy(durationSeconds, coverTokensAmount.times(10), {from: USER2}), reason);
    });
  });

  describe('buyPolicyFor', async () => {
    const daiAmount = toBN(10000);
    const liquidityAmount = toBN(5000);
    const durationSeconds = toBN(100).times(24).times(60).times(60);
    const coverTokensAmount = toBN(1000);
    let price;

    beforeEach('setup', async () => {
      await dai.transfer(USER1, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER1});

      await dai.transfer(USER2, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER2});

      await setCurrentTime(1);
      await policyBookMock.addLiquidity(liquidityAmount, {from: USER1});
      assert.equal(await policyBookMock.totalLiquidity(), liquidityAmount.toString());
      assert.equal(await dai.balanceOf(policyBookMock.address), liquidityAmount.toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(liquidityAmount).toString());
      price = toBN(await policyBookMock.getQuote(durationSeconds, coverTokensAmount));
    });

    it('should set correct values', async () => {
      await policyBookMock.buyPolicyFor(USER2, durationSeconds, coverTokensAmount);

      assert.equal(await policyBookMock.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBookMock.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationSeconds, durationSeconds.toString());

      assert.equal(toBN(await dai.balanceOf(policyBookMock.address)).toString(),
        liquidityAmount.plus(price).toString());
      assert.equal(await dai.balanceOf(USER2),
        daiAmount.minus(price).toString());
    });

    it('should get exception, policy holder already exists', async () => {
      await policyBookMock.buyPolicyFor(USER2, durationSeconds, coverTokensAmount);

      assert.equal(await policyBookMock.totalCoverTokens(), coverTokensAmount.toString());

      const policyHolder = await policyBookMock.policyHolders(USER2);
      assert.equal(policyHolder.coverTokens, coverTokensAmount.toString());
      assert.equal(policyHolder.durationSeconds, durationSeconds.toString());

      assert.equal(toBN(await dai.balanceOf(policyBookMock.address)).toString(),
        liquidityAmount.plus(price).toString());
      assert.equal(await dai.balanceOf(USER2),
        daiAmount.minus(price).toString());

      const reason = 'The policy holder already exists';
      await truffleAssert.reverts(policyBookMock.buyPolicyFor(USER2, durationSeconds, coverTokensAmount),
        reason);
    });

    it('should get exception, not enough available liquidity', async () => {
      const reason = 'Not enough available liquidity';
      await truffleAssert.reverts(policyBookMock
      .buyPolicyFor(USER2, durationSeconds, coverTokensAmount.times(10)), reason);
    });
  });

  describe('addLiquidity', async () => {
    const daiAmount = toBN(10000);
    const amount = toBN(1000);

    beforeEach('setup', async () => {
      await dai.transfer(USER1, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER1});
    });

    it('should set correct values', async () => {
      await setCurrentTime(1);
      await policyBookMock.addLiquidity(amount, {from: USER1});

      assert.equal(await policyBookMock.totalLiquidity(), amount.toString());
      assert.equal(await policyBookMock.balanceOf(USER1), amount.toString());
      assert.equal(await dai.balanceOf(policyBookMock.address), amount.toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(amount).toString());
    });

    it('should update the values correctly', async () => {
      await setCurrentTime(1);
      await policyBookMock.addLiquidity(amount, {from: USER1});

      assert.equal(await policyBookMock.totalLiquidity(), amount.toString());
      assert.equal(await policyBookMock.balanceOf(USER1), amount.toString());
      assert.equal(await dai.balanceOf(policyBookMock.address), amount.toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(amount).toString());

      await setCurrentTime(100);
      await policyBookMock.addLiquidity(amount, {from: USER1});

      assert.equal(await policyBookMock.totalLiquidity(), amount.times(2).toString());
      assert.equal(await policyBookMock.balanceOf(USER1), amount.times(2).toString());
      assert.equal(await dai.balanceOf(policyBookMock.address), amount.times(2).toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(amount.times(2)).toString());
    });
  });

  describe('addLiquidityFor', async () => {
    const daiAmount = toBN(10000);
    const amount = toBN(1000);

    beforeEach('setup', async () => {
      await dai.transfer(USER1, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER1});
    });

    it('should set correct values', async () => {
      await setCurrentTime(1);
      await policyBookMock.addLiquidityFor(USER1, amount);

      assert.equal(await policyBookMock.totalLiquidity(), amount.toString());
      assert.equal(await policyBookMock.balanceOf(USER1), amount.toString());
      assert.equal(await dai.balanceOf(policyBookMock.address), amount.toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(amount).toString());
    });

    it('should update the values correctly', async () => {
      await setCurrentTime(1);
      await policyBookMock.addLiquidityFor(USER1, amount);

      assert.equal(await policyBookMock.totalLiquidity(), amount.toString());
      assert.equal(await policyBookMock.balanceOf(USER1), amount.toString());
      assert.equal(await dai.balanceOf(policyBookMock.address), amount.toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(amount).toString());

      await setCurrentTime(100);
      await policyBookMock.addLiquidityFor(USER1, amount);

      assert.equal(await policyBookMock.totalLiquidity(), amount.times(2).toString());
      assert.equal(await policyBookMock.balanceOf(USER1), amount.times(2).toString());
      assert.equal(await dai.balanceOf(policyBookMock.address), amount.times(2).toString());
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
      await dai.approve(policyBookMock.address, daiAmount, {from: USER1});

      await dai.transfer(USER2, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER2});
    });

    it('should successfully withdraw tokens', async () => {
      await setCurrentTime(1);
      await policyBookMock.addLiquidity(liquidityAmount, {from: USER1});
      assert.equal(await policyBookMock.totalLiquidity(), liquidityAmount.toString());

      price = toBN(await policyBookMock.getQuote(durationSeconds, coverTokensAmount));

      await policyBookMock.buyPolicy(durationSeconds, coverTokensAmount, {from: USER2});
      assert.equal(await policyBookMock.totalCoverTokens(), coverTokensAmount.toString());

      assert.equal(await dai.balanceOf(policyBookMock.address), liquidityAmount.plus(price).toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(liquidityAmount).toString());

      await setCurrentTime(10);
      await policyBookMock.withdrawLiquidity(amountToWithdraw, {from: USER1});
      assert.equal(toBN(await policyBookMock.totalLiquidity()).toString(),
        liquidityAmount.minus(amountToWithdraw).toString());

      assert.equal(await policyBookMock.balanceOf(USER1),
        liquidityAmount.minus(amountToWithdraw).toString());

      assert.equal(await dai.balanceOf(policyBookMock.address),
        liquidityAmount.plus(price).minus(amountToWithdraw).toString());
      assert.equal(await dai.balanceOf(USER1),
        daiAmount.minus(liquidityAmount).plus(amountToWithdraw).toString());
    });

    it('should get exception, amount to be withdrawn is greater than the deposited amount', async () => {
      await setCurrentTime(1);
      await policyBookMock.addLiquidity(liquidityAmount, {from: USER1});
      await policyBookMock.addLiquidity(liquidityAmount, {from: USER2});
      assert.equal(toBN(await policyBookMock.totalLiquidity()).toString(), liquidityAmount.times(2).toString());

      const reason = 'The amount to be withdrawn is greater than the deposited amount';
      await truffleAssert.reverts(policyBookMock.withdrawLiquidity(liquidityAmount.plus(1), {from: USER1}), reason);
    });

    it('should get exception, not enough available liquidity', async () => {
      await setCurrentTime(1);
      await policyBookMock.addLiquidity(liquidityAmount, {from: USER1});
      assert.equal(toBN(await policyBookMock.totalLiquidity()).toString(), liquidityAmount.toString());

      await policyBookMock.buyPolicy(1, coverTokensAmount, {from: USER2});
      assert.equal(toBN(await policyBookMock.totalCoverTokens()).toString(), coverTokensAmount.toString());

      const reason = 'Not enough available liquidity';
      await truffleAssert.reverts(policyBookMock.withdrawLiquidity(amountToWithdraw.times(3), {from: USER1}), reason);
    });

    it('should be allowed to withdraw liquidity after token transfer', async () => {
      await policyBookMock.addLiquidity(liquidityAmount, {from: USER1});
      const bmiDaibalance = await policyBookMock.balanceOf(USER1);
      await policyBookMock.transfer(USER2, bmiDaibalance, {from: USER1});
      await policyBookMock.withdrawLiquidity(bmiDaibalance, {from: USER2});

      assert.equal(await dai.balanceOf(policyBookMock.address), toBN(0).toString());
      assert.equal(await dai.balanceOf(USER1), daiAmount.minus(liquidityAmount).toString());
      assert.equal(await dai.balanceOf(USER2), daiAmount.plus(liquidityAmount).toString());
      assert.equal(await policyBookMock.totalSupply(), toBN(0).toString());
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

      await policyBookMock.setTotalLiquidity(total);
      await policyBookMock.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBookMock.getQuote(seconds, myMoney));

      assert.equal(calculatedPrice.toString(), toBN(21857).toString(), 'UR < RISKY case is incorrect');
    });

    it('calculating annual cost where UR = 90% > RISKY, (doc example 2)', async () => {
      seconds = 365 * 24 * 60 * 60;
      myMoney = 4000000; // 4mil
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await policyBookMock.setTotalLiquidity(total);
      await policyBookMock.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBookMock.getQuote(seconds, myMoney));

      assert.equal(calculatedPrice.toString(), toBN(4399999), 'UR > RISKY case is incorrect');
    });

    it('calculating annual cost where UR = 6% < RISKY, (doc example 3)', async () => {
      seconds = 365 * 24 * 60 * 60;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 500000; // 500k

      await policyBookMock.setTotalLiquidity(total);
      await policyBookMock.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBookMock.getQuote(seconds, myMoney));

      assert.equal(calculatedPrice.toString(), toBN(5000), 'UR < RISKY case is incorrect');
    });

    it('calculating 100 days cost where UR = 51% < RISKY', async () => {
      seconds = 100 * 24 * 60 * 60;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await policyBookMock.setTotalLiquidity(total);
      await policyBookMock.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBookMock.getQuote(seconds, myMoney));
      const expectedPrice = toBN(21857).times(seconds).idiv(365 * 24 * 60 * 60);
      assert.equal(calculatedPrice.toString(), expectedPrice.toString(), 'UR < RISKY case is incorrect');
    });

    it('calculating 1 day cost where UR = 51% < RISKY', async () => {
      seconds = 24 * 60 * 60;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await policyBookMock.setTotalLiquidity(total);
      await policyBookMock.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBookMock.getQuote(seconds, myMoney));
      const expectedPrice = toBN(21857).times(seconds).idiv(365 * 24 * 60 * 60);
      assert.equal(calculatedPrice.toString(), expectedPrice.toString(), 'UR < RISKY case is incorrect');
    });

    it('calculating 999 days cost where UR = 51% < RISKY', async () => {
      seconds = 999 * 24 * 60 * 60;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await policyBookMock.setTotalLiquidity(total);
      await policyBookMock.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBookMock.getQuote(seconds, myMoney));
      const expectedPrice = toBN(21857).times(seconds).idiv(365 * 24 * 60 * 60);
      assert.equal(calculatedPrice.toString(), expectedPrice.toString(), 'UR < RISKY case is incorrect');
    });

    it('calculating 0 seconds cost', async () => {
      seconds = 0;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await policyBookMock.setTotalLiquidity(total);
      await policyBookMock.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBookMock.getQuote(seconds, myMoney));
      assert.equal(calculatedPrice.toString(), 0, 'No matter what it should equal to 0');
    });

    it('calculating annual cost, forcing minimal percentage threshold', async () => {
      seconds = 365 * 24 * 60 * 60;
      myMoney = 100; // 100
      total = 10000000; // 10mil
      bought = 0; // 0

      await policyBookMock.setTotalLiquidity(total);
      await policyBookMock.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBookMock.getQuote(seconds, myMoney));
      const expectedPrice = toBN(5);
      assert.equal(calculatedPrice.toString(), expectedPrice.toString(), 'Less than minimal');
    });

    it('calculating 10 years cost where UR = 51% < RISKY + really big money', async () => {
      seconds = toBN(365).times(10).times(24).times(60).times(60); // 10 years
      myMoney = toBN(10).pow(12); // 1tril
      total = toBN(10).pow(14); // 100tril
      bought = toBN(10).pow(13).times(5); // 50tril

      await policyBookMock.setTotalLiquidity(total);
      await policyBookMock.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBookMock.getQuote(seconds, myMoney));
      const expectedPrice = toBN(2185714285714);
      assert.equal(calculatedPrice.toString(), expectedPrice.toString(), 'UR < RISKY case is incorrect');
    });

    it('edge case: calculating annual cost where UR = 100% > RISKY', async () => {
      seconds = 365 * 24 * 60 * 60;
      myMoney = 500000; // 500k
      total = 1000000; // 1mil
      bought = 500000; // 500k

      await policyBookMock.setTotalLiquidity(total);
      await policyBookMock.setTotalCoverTokens(bought);

      const calculatedPrice = toBN(await policyBookMock.getQuote(seconds, myMoney));
      assert.equal(calculatedPrice, 750000, 'UR > RISKY case is incorrect');
    });

    it('require more tokens than there exists (should revert)', async () => {
      seconds = 365 * 24 * 60 * 60;
      myMoney = 600000; // 600k
      total = 1000000; // 1mil
      bought = 500000; // 500k

      await policyBookMock.setTotalLiquidity(total);
      await policyBookMock.setTotalCoverTokens(bought);

      await truffleAssert.reverts(policyBookMock.getQuote(seconds, myMoney),
        'Requiring more than there exists');
    });

    it('pool is empty (should revert)', async () => {
      seconds = 365 * 24 * 60 * 60;
      myMoney = 0; // 0
      total = 0; // 0
      bought = 0; // 0

      await policyBookMock.setTotalLiquidity(total);
      await policyBookMock.setTotalCoverTokens(bought);

      await truffleAssert.reverts(policyBookMock.getQuote(seconds, myMoney),
        'The pool is empty');
    });

    it('forcing overflow (should revert)', async () => {
      seconds = 365 * 24 * 60 * 60;
      myMoney = toBN(4).times(toBN(10).pow(toBN(76)));
      total = toBN(10).times(toBN(10).pow(toBN(76)));
      bought = toBN(5).times(toBN(10).pow(toBN(76)));

      await policyBookMock.setTotalLiquidity(total);
      await policyBookMock.setTotalCoverTokens(bought);

      await truffleAssert.reverts(policyBookMock.getQuote(seconds, myMoney), 'SafeMath: multiplication overflow');
    });
  });
});

function toBN(number) {
  return new BigNumber(number);
}
