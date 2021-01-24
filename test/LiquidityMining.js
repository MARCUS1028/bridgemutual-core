const LiquidityMining = artifacts.require('LiquidityMining.sol');
const BMIToken = artifacts.require('BMIToken.sol');

const Reverter = require('./helpers/reverter');
const BigNumber = require('bignumber.js');
const { assert } = require('chai');

const setCurrentTime = require('./helpers/ganacheTimeTraveler');
const truffleAssert = require('truffle-assertions');

contract('LiquidityMining', async (accounts) => {
  const reverter = new Reverter(web3);

  const OWNER = accounts[0];
  const USER1 = accounts[1];
  const USER2 = accounts[2];
  const USER3 = accounts[3];
  const endLiquidityMiningTime = toBN(1).plus(1209600); //Now + 2 weeks
  const oneMonth = toBN(2592000);
  let liquidityMining;

  before('setup', async () => {
    bmiToken = await BMIToken.new(OWNER);

    await setCurrentTime(1);
    liquidityMining = await LiquidityMining.new(bmiToken.address);

    await reverter.snapshot();
  });

  afterEach('revert', reverter.revert);

  describe('investDAI', async () => {
    const investAmount = toBN(1000);

    it('should create new group and invest DAI', async () => {
      const result = await liquidityMining.investDAI(0, investAmount, {from: USER1});

      await checkLeaderboard(liquidityMining, [1]);

      assert.equal(result.logs.length, 2);
      assert.equal(result.logs[1].event, 'DAIInvested');
      assert.equal(result.logs[1].args._groupID, 1);
      assert.equal(result.logs[1].args._tokensAmount, 1000);
      assert.equal(result.logs[1].args._newTotalGroupAmount, 1000);
    });

    it('should create many group and investDAI with diiferent users', async () => {
      await liquidityMining.investDAI(0, investAmount, {from: USER1});
      await liquidityMining.investDAI(0, investAmount.div(2), {from: USER1});
      await liquidityMining.investDAI(0, investAmount.times(10), {from: USER2});
      await liquidityMining.investDAI(0, investAmount.plus(1), {from: USER2});
      await liquidityMining.investDAI(0, investAmount.minus(1), {from: USER1});

      await checkLeaderboard(liquidityMining, [3, 4, 1, 5, 2]);

      await liquidityMining.investDAI(1, investAmount.times(10), {from: USER2});
      await liquidityMining.investDAI(3, investAmount.div(2), {from: USER1});
      await liquidityMining.investDAI(5, investAmount, {from: USER2});

      await checkLeaderboard(liquidityMining, [1, 3, 5, 4, 2]);

      assert.equal(toBN(await liquidityMining.totalGroupsAmount(1)).toString(), 11000);
      assert.equal(toBN(await liquidityMining.totalGroupsAmount(2)).toString(), 500);
      assert.equal(toBN(await liquidityMining.totalGroupsAmount(3)).toString(), 10500);
      assert.equal(toBN(await liquidityMining.totalGroupsAmount(4)).toString(), 1001);
      assert.equal(toBN(await liquidityMining.totalGroupsAmount(5)).toString(), 1999);
    });
  });

  describe('updateLeaderboard', async () => {
    it('should correct update leaderboard with bigger and bigger values', async () => {
      let amount = toBN(100);

      for (let i = 1; i <= 20; i++) {
        await liquidityMining.investDAI(0, amount);
        amount = amount.plus(100);
      }

      const firstIndex = toBN(20);

      for (let i = 0; i < 10; i++) {
        assert.equal((await liquidityMining.leaderboard(toBN(i))).toString(), firstIndex.minus(i).toString());
      }
    });

    it('should correct update leaderboard with smaller and smaller values', async () => {
      let amount = toBN(150);

      for (let i = 1; i <= 20; i++) {
        await liquidityMining.investDAI(0, amount);
        amount = amount.minus(5);
      }

      for (let i = 0; i < 10; i++) {
        assert.equal((await liquidityMining.leaderboard(toBN(i))).toString(), i + 1);
      }
    });

    it('should correct update leaderboard with many same values', async () => {
      let amount = toBN(150);

      for (let i = 1; i <= 20; i++) {
        await liquidityMining.investDAI(0, amount);
      }

      for (let i = 0; i < 10; i++) {
        assert.equal((await liquidityMining.leaderboard(toBN(i))).toString(), i + 1);
      }
    });
  });

  describe('getRewardFromGroup', async () => {
    const amountToTransfer = toBN(1000000);

    beforeEach('setup', async () => {
      await bmiToken.transfer(liquidityMining.address, amountToTransfer);

      assert.equal(await bmiToken.balanceOf(liquidityMining.address), amountToTransfer.toString());

      let amount = toBN(150);
      let expectedArray = new Array(10);

      for (let i = 1; i <= 15; i++) {
        await liquidityMining.investDAI(0, amount, {from: USER1});
        expectedArray[i - 1] = i;
        amount = amount.minus(5);
      }

      //await checkLeaderboard(liquidityMining, expectedArray);
    });

    it('should get zero if reward not be able', async () => {
      await setCurrentTime(endLiquidityMiningTime.plus(10));

      await liquidityMining.getRewardFromGroup(11, {from: USER1});
      assert.equal(toBN(await bmiToken.balanceOf(USER1)).toString(), 0);
    });

    it('should get 100% of tokens when user invest 100%', async () => {
      await setCurrentTime(endLiquidityMiningTime.plus(10));

      await liquidityMining.getRewardFromGroup(1, {from: USER1});
      assert.equal(toBN(await bmiToken.balanceOf(USER1)).toString(), 50000);
    });

    it('should correct get reward for different users', async () => {
      await liquidityMining.investDAI(11, 400, {from: USER2});
      await liquidityMining.investDAI(11, 500, {from: USER3});
      await setCurrentTime(endLiquidityMiningTime.plus(10));

      await liquidityMining.getRewardFromGroup(11, {from: USER1});
      await liquidityMining.getRewardFromGroup(11, {from: USER2});
      await liquidityMining.getRewardFromGroup(11, {from: USER3});

      assert.equal(toBN(await bmiToken.balanceOf(USER1)).toString(), 5000);
      assert.equal(toBN(await bmiToken.balanceOf(USER2)).toString(), 20000);
      assert.equal(toBN(await bmiToken.balanceOf(USER3)).toString(), 25000);
    });

    it('should get 100% of tokens 5 month reward on 2 place', async () => {
      await setCurrentTime(endLiquidityMiningTime.plus(10).plus(oneMonth.times(4)));

      await liquidityMining.getRewardFromGroup(2, {from: USER1});
      assert.equal(toBN(await bmiToken.balanceOf(USER1)).toString(), 50000);
    });

    it('should correct get reward multiple times', async () => {
      await setCurrentTime(endLiquidityMiningTime.plus(10).plus(oneMonth));

      await liquidityMining.getRewardFromGroup(1, {from: USER1});
      assert.equal(toBN(await bmiToken.balanceOf(USER1)).toString(), 100000);

      await setCurrentTime(endLiquidityMiningTime.plus(10).plus(oneMonth.times(7)));

      await liquidityMining.getRewardFromGroup(1, {from: USER1});
      assert.equal(toBN(await bmiToken.balanceOf(USER1)).toString(), 250000);
    });

    it('should correct get reward multiple times with two users', async () => {
      let startTime = endLiquidityMiningTime.plus(10);
      let amount = toBN(150);
      let expectedArray = new Array(10);

      for (let i = 1; i <= 15; i++) {
        await liquidityMining.investDAI(i, amount, {from: USER2});
        amount = amount.minus(5);
        expectedArray[i - 1] = i;
      }
      await checkLeaderboard(liquidityMining, expectedArray);

      let totalTokens = toBN(2000);
      for (let i = 0; i < 4; i++) {
        await setCurrentTime(startTime.plus(oneMonth.times(i)));

        await liquidityMining.getRewardFromGroup(8, {from: USER1});
        await liquidityMining.getRewardFromGroup(8, {from: USER2});

        assert.equal(toBN(await bmiToken.balanceOf(USER1)).toString(), totalTokens.toString());
        assert.equal(toBN(await bmiToken.balanceOf(USER2)).toString(), totalTokens.toString());

        totalTokens = totalTokens.plus(2000);
      }
    });

    it('should get exception, 2 weeks has not expire', async () => {
      await truffleAssert.reverts(liquidityMining.getRewardFromGroup(3),
        '2 weeks after liquidity mining time has not expire');
    });
  });

  describe('checkAvailableReward', async () => {
    beforeEach('setup', async () => {
      let amount = toBN(150);
      let expectedArray = new Array(10);

      for (let i = 1; i <= 15; i++) {
        await liquidityMining.investDAI(0, amount);
        expectedArray[i - 1] = i;
        amount = amount.minus(5);
      }

      //await checkLeaderboard(liquidityMining, expectedArray);
    });

    it('should return true, user have 2 months reward', async () => {
      const neededTime = endLiquidityMiningTime.plus(oneMonth).plus(10);
      await setCurrentTime(neededTime);
      assert.isTrue(await liquidityMining.checkAvailableReward.call(5));

      await setCurrentTime(neededTime);
      const result = await liquidityMining.checkAvailableReward(5);

      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].event, 'RewardInfoUpdated');
      assert.equal(result.logs[0].args._groupID, 5);
      assert.equal(result.logs[0].args._address, OWNER);
      assert.equal(result.logs[0].args._newCountOfMonth, 2);
      assert.equal(result.logs[0].args._newLastUpdate, neededTime.toString());
    });

    it('should return true, user have 1 months reward', async () => {
      const neededTime = endLiquidityMiningTime.plus(10);
      await setCurrentTime(neededTime);
      assert.isTrue(await liquidityMining.checkAvailableReward.call(5));

      await setCurrentTime(neededTime);
      const result = await liquidityMining.checkAvailableReward(5);

      assert.equal(result.logs[0].args._newCountOfMonth, 1);
      assert.equal(result.logs[0].args._newLastUpdate, neededTime.toString());
    });

    it('should return true, user have 5 months reward', async () => {
      const neededTime = endLiquidityMiningTime.plus(oneMonth.times(7));
      await setCurrentTime(neededTime);
      assert.isTrue(await liquidityMining.checkAvailableReward.call(5));

      await setCurrentTime(neededTime);
      const result = await liquidityMining.checkAvailableReward(5);

      assert.equal(result.logs[0].args._newCountOfMonth, 5);
      assert.equal(result.logs[0].args._newLastUpdate, neededTime.toString());
    });

    it('should return false, the group is not in the lead', async () => {
      assert.isFalse(await liquidityMining.checkAvailableReward.call(12));
    });

    it('should return false, the group is not in the lead', async () => {
      assert.isFalse(await liquidityMining.checkAvailableReward.call(5, {from: USER1}));
    });

    it('should return false, no rewards available', async () => {
      assert.isFalse(await liquidityMining.checkAvailableReward.call(5));
    });
  });
});

function toBN(number) {
  return new BigNumber(number);
}

async function showLeaderboard(liquidityMining) {
  console.log('____________');
  console.log('Size - ' + (await liquidityMining.getLeaderboardSize()).toString());
  const size = toBN(await liquidityMining.getLeaderboardSize());
  for (let i = 0; i < size; i++) {
    console.log((await liquidityMining.leaderboard(toBN(i))).toString());
  }
}

async function checkLeaderboard(liquidityMining, expectedLeaderboard) {
  const size = toBN(await liquidityMining.getLeaderboardSize());

  for (let i = 0; i < size; i++) {
    assert.equal(toBN(await liquidityMining.leaderboard(i)).toString(), toBN(expectedLeaderboard[i]).toString());
  }
}