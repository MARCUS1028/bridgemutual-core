const LiquidityMining = artifacts.require('LiquidityMining.sol');

const Reverter = require('./helpers/reverter');
const BigNumber = require('bignumber.js');
const { assert } = require('chai');

contract.only('LiquidityMining', async (accounts) => {
  const reverter = new Reverter(web3);

  const USER1 = accounts[0];
  let liquidityMining;

  before('setup', async () => {
    liquidityMining = await LiquidityMining.new();

    await reverter.snapshot();
  });

  afterEach('revert', reverter.revert);

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
        console.log((await liquidityMining.leaderboard(toBN(i))).toString());
      }
      console.log((await liquidityMining.getLeaderboardSize()).toString());
    });

    it('should correct update leaderboard with smaller and smaller values', async () => {
      let amount = toBN(150);

      for (let i = 1; i <= 20; i++) {
        await liquidityMining.investDAI(0, amount);
        amount = amount.minus(5);
      }

      for (let i = 0; i < 10; i++) {
        assert.equal((await liquidityMining.leaderboard(toBN(i))).toString(), i + 1);
        console.log((await liquidityMining.leaderboard(toBN(i))).toString());
      }
      console.log((await liquidityMining.getLeaderboardSize()).toString());
    });

    it('should correct update leaderboard with many same values', async () => {
      let amount = toBN(150);

      for (let i = 1; i <= 20; i++) {
        await liquidityMining.investDAI(0, amount);
      }

      for (let i = 0; i < 10; i++) {
        assert.equal((await liquidityMining.leaderboard(toBN(i))).toString(), i + 1);
        console.log((await liquidityMining.leaderboard(toBN(i))).toString());
      }
    });

    it('should correct update leaderboard with additional invest', async () => {
      let amount = toBN(100);

      for (let i = 1; i <= 15; i++) {
        await liquidityMining.investDAI(0, amount);
        amount = amount.minus(5);
      }

      await showLeaderboard(liquidityMining);

      await liquidityMining.investDAI(5, 300);

      await showLeaderboard(liquidityMining);
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
