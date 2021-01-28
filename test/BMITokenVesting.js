const BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');
const {deployProxy} = require('@openzeppelin/truffle-upgrades');

const Reverter = require('./helpers/reverter');
const setCurrentTime = require('./helpers/ganacheTimeTraveler');
const {ZERO_ADDRESS} = require('./helpers/constants');

const BMIToken = artifacts.require('BMIToken.sol');
const BMITokenVesting = artifacts.require('BMITokenVesting.sol');

const VestingSchedule = {
  ANGELROUND: 0,
  SEEDROUND: 1,
  PRIVATEROUND: 2,
  LISTINGS: 3,
  GROWTH: 4,
  FOUNDERS: 5,
  DEVELOPERS: 6,
  BUGFINDING: 7,
  VAULT: 8,
  ADVISORSCUSTOMFIRST: 9,
  ADVISORSCUSTOMSECOND: 10,
};

contract('BMITokenVesting', async (accounts) => {
  const reverter = new Reverter(web3);

  const tgeTimestamp = toBN(1600000000);
  const secondsInMonth = toBN(60).times(60).times(24).times(30);

  const OTHER_ADDR = accounts[1];
  const SOME_ADDR_1 = accounts[2];
  const SOME_ADDR_2 = accounts[3];
  let token;
  let vesting;

  before('setup', async () => {
    vesting = await deployProxy(BMITokenVesting, [tgeTimestamp]);
    token = await deployProxy(BMIToken, [vesting.address]);

    await reverter.snapshot();
  });

  afterEach('revert', reverter.revert);

  describe('setToken', async () => {
    it('should allow owner to set token', async () => {
      await vesting.setToken(token.address);
    });

    it('should not allow not owner to set token', async () => {
      await truffleAssert.reverts(
        vesting.setToken(token.address, {
          from: OTHER_ADDR,
        }),
        'Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.',
      );
    });

    it('should not allow to change token', async () => {
      await vesting.setToken(token.address);
      await truffleAssert.reverts(vesting.setToken(OTHER_ADDR), 'token is already set');
    });

    it('should emit valid set token event', async () => {
      const tx = await vesting.setToken(token.address);
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'TokenSet');
      assert.equal(tx.logs[0].args.token, token.address);
    });
  });

  describe('createVesting', async () => {
    beforeEach('setup', async () => {
      await vesting.setToken(token.address);
      await setCurrentTime(1);
    });

    it('should not allow not owner to create vesting', async () => {
      await truffleAssert.reverts(
        vesting.createVesting(OTHER_ADDR, 100, VestingSchedule.ANGELROUND, false, {
          from: OTHER_ADDR,
        }),
        'Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.',
      );
    });

    it('should not allow to create vesting larger than tokens available', async () => {
      const tokensLeft = toBN(await token.balanceOf(vesting.address));

      await truffleAssert.reverts(
        vesting.createVesting(OTHER_ADDR, tokensLeft.plus(1), VestingSchedule.ANGELROUND, true),
        'Not enough tokens',
      );
    });

    it('should not allow to create vesting with zero address beneficiar', async () => {
      await truffleAssert.reverts(
        vesting.createVesting(ZERO_ADDRESS, 1, VestingSchedule.ANGELROUND, true),
        'Cannot create vesting for zero address',
      );
    });

    it('should not allow to create vesting larger than tokens left available', async () => {
      const tokensLeft = await token.balanceOf(vesting.address);

      await vesting.createVesting(OTHER_ADDR, tokensLeft, VestingSchedule.ANGELROUND, true);
      await truffleAssert.reverts(
        vesting.createVesting(OTHER_ADDR, toBN(10), VestingSchedule.ANGELROUND, true),
        'Not enough tokens',
      );
    });

    it('should add amount to amount in vesting', async () => {
      assert.equal(await vesting.amountInVestings(), 0);
      await vesting.createVesting(OTHER_ADDR, 100, VestingSchedule.ANGELROUND, true);
      assert.equal(await vesting.amountInVestings(), 100);
    });

    it('should create valid vesting instance', async () => {
      const vestingId = 0;

      const tx = await vesting.createVesting(OTHER_ADDR, 100, VestingSchedule.ANGELROUND, true);
      assert.equal(tx.logs[0].event, 'VestingAdded');
      assert.equal(tx.logs[0].args.vestingId, vestingId);

      const vestingData = await vesting.getVestingById(vestingId);
      assert.equal(vestingData.isValid, true);
      assert.equal(vestingData.beneficiary, OTHER_ADDR);
      assert.equal(vestingData.amount, 100);
      assert.equal(vestingData.vestingSchedule, VestingSchedule.ANGELROUND);
      assert.equal(vestingData.paidAmount, 0);
      assert.equal(vestingData.isCancelable, true);
    });

    it('should emit valid vesting add event', async () => {
      const tx = await vesting.createVesting(OTHER_ADDR, 100, VestingSchedule.ANGELROUND, true);

      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'VestingAdded');
      assert.equal(tx.logs[0].args.vestingId, 0);
      assert.equal(tx.logs[0].args.beneficiary, OTHER_ADDR);
    });

    it('should emit successive ids', async () => {
      for (let i = 0; i < 5; i++) {
        const tx = await vesting.createVesting(OTHER_ADDR, 100, VestingSchedule.ANGELROUND, true);
        assert.equal(tx.logs[0].args.vestingId, i);
      }
    });
  });

  describe('createVestingBulk', async () => {
    beforeEach('setup', async () => {
      await vesting.setToken(token.address);
    });

    it('should not allow not owner to call', async () => {
      await truffleAssert.reverts(
        vesting.createVestingBulk([OTHER_ADDR], [100], [VestingSchedule.ANGELROUND], [false], {
          from: OTHER_ADDR,
        }),
        'Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.',
      );
    });

    it('should revert with mistatched parameters length', async () => {
      await truffleAssert.reverts(
        vesting.createVestingBulk(
          [OTHER_ADDR, SOME_ADDR_1, SOME_ADDR_2],
          [100, 200, 300],
          [VestingSchedule.ANGELROUND, VestingSchedule.SEEDROUND],
          [false, true, false],
        ),
        'Parameters length mismatch',
      );
    });

    it('should create valid vesting instance', async () => {
      await vesting.createVestingBulk(
        [OTHER_ADDR, SOME_ADDR_1, SOME_ADDR_2],
        [100, 200, 300],
        [VestingSchedule.ANGELROUND, VestingSchedule.SEEDROUND, VestingSchedule.PRIVATEROUND],
        [false, true, false],
      );

      const firstVesting = await vesting.vestings(0);
      assert.equal(firstVesting.isValid, true);
      assert.equal(firstVesting.beneficiary, OTHER_ADDR);
      assert.equal(firstVesting.amount, 100);
      assert.equal(firstVesting.vestingSchedule, VestingSchedule.ANGELROUND);
      assert.equal(firstVesting.isCancelable, false);

      const secondVesting = await vesting.vestings(1);
      assert.equal(secondVesting.isValid, true);
      assert.equal(secondVesting.beneficiary, SOME_ADDR_1);
      assert.equal(secondVesting.amount, 200);
      assert.equal(secondVesting.vestingSchedule, VestingSchedule.SEEDROUND);
      assert.equal(secondVesting.isCancelable, true);

      const thirdVesting = await vesting.vestings(2);
      assert.equal(thirdVesting.isValid, true);
      assert.equal(thirdVesting.beneficiary, SOME_ADDR_2);
      assert.equal(thirdVesting.amount, 300);
      assert.equal(thirdVesting.vestingSchedule, VestingSchedule.PRIVATEROUND);
      assert.equal(thirdVesting.isCancelable, false);
    });
  });

  describe('cancelVesting', async () => {
    const vestingId = 0;

    beforeEach('setup', async () => {
      await vesting.setToken(token.address);

      await setCurrentTime(6);
      const tx = await vesting.createVesting(OTHER_ADDR, 100, VestingSchedule.ANGELROUND, true);

      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'VestingAdded');
      assert.equal(tx.logs[0].args.vestingId, 0);
    });

    it('should not allow not owner to cancel vesting', async () => {
      await truffleAssert.reverts(
        vesting.cancelVesting(vestingId, {
          from: OTHER_ADDR,
        }),
        'Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.',
      );
    });

    it('should not allow to cancel nonexistent vesting', async () => {
      await truffleAssert.reverts(vesting.cancelVesting(vestingId + 1), 'No vesting with such id');
    });

    it('should not allow to cancel already canceled vesting', async () => {
      await vesting.cancelVesting(vestingId);
      await truffleAssert.reverts(vesting.cancelVesting(vestingId), 'Vesting is canceled');
    });

    it('should not allow to cancel non cancelable vesting', async () => {
      await vesting.createVesting(OTHER_ADDR, 100, VestingSchedule.ANGELROUND, false);

      await truffleAssert.reverts(vesting.cancelVesting(vestingId + 1), 'Vesting is not cancelable');
    });

    it('should invalidate vesting', async () => {
      await vesting.cancelVesting(vestingId);
      const vestingData = await vesting.getVestingById(vestingId);
      assert.equal(vestingData.isValid, false);
    });

    it('should emit valid vesting canceled event', async () => {
      const tx = await vesting.cancelVesting(vestingId);

      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'VestingCanceled');
      assert.equal(tx.logs[0].args.vestingId, vestingId);
    });

    it('should lower amount in vesting', async () => {
      await vesting.cancelVesting(vestingId);
      assert.equal(await vesting.amountInVestings(), 0);
    });

    it('should lower amount in vesting for partly paid vesting', async () => {
      await setCurrentTime(tgeTimestamp.plus(secondsInMonth.times(2)).plus(10));
      await vesting.withdrawFromVesting(vestingId);

      assert.equal(toBN(await vesting.amountInVestings()).toString(), 50);
      await vesting.cancelVesting(vestingId);
      assert.equal(toBN(await vesting.amountInVestings()).toString(), 0);
    });
  });

  describe('withdrawFromVesting', async () => {
    const vestingId = 0;

    beforeEach('setup', async () => {
      await vesting.setToken(token.address);

      await setCurrentTime(6);
      const tx = await vesting.createVesting(OTHER_ADDR, 100, VestingSchedule.ANGELROUND, true);

      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'VestingAdded');
      assert.equal(tx.logs[0].args.vestingId, 0);
    });

    it('should not allow to withdraw invalid vesting', async () => {
      await truffleAssert.reverts(
        vesting.withdrawFromVesting(vestingId + 1, {
          from: OTHER_ADDR,
        }),
        'No vesting with such id',
      );
    });

    it('should not withdraw anything if called too early', async () => {
      await vesting.withdrawFromVesting(vestingId, {
        from: OTHER_ADDR,
      });

      assert.equal(await token.balanceOf(OTHER_ADDR), 0);
    });

    it('should not allow to withdraw from canceled vesting', async () => {
      await vesting.cancelVesting(vestingId);
      await truffleAssert.reverts(vesting.withdrawFromVesting(vestingId), 'Vesting is canceled');
    });

    // No vesting schedules with cliff for now
    // it('should not withdraw anything on a cliff period', async () => {
    //   await vesting.createVesting(OTHER_ADDR, 100, VestingSchedule.ANGELROUND, true);

    //   await setCurrentTime(secondsInMonth.times(5));

    //   await vesting.withdrawFromVesting(vestingId + 1, {from: OTHER_ADDR});

    //   assert.equal(await token.balanceOf(OTHER_ADDR), 0);
    // });

    // it('should withdraw right amount after cliff end', async () => {
    //   await vesting.createVesting(OTHER_ADDR, 100, 1, 2, 25, 2, true);

    //   await setCurrentTime(secondsInMonth.times(6).plus(10));

    //   await vesting.withdrawFromVesting(vestingId + 1, {from: OTHER_ADDR});

    //   assert.equal(await token.balanceOf(OTHER_ADDR), 75);
    // });

    it('should withdraw right amount on successive withdrawals', async () => {
      await vesting.createVesting(OTHER_ADDR, 100, VestingSchedule.ANGELROUND, true);

      for (let i = 1; i < 4; i++) {
        await setCurrentTime(tgeTimestamp.plus(secondsInMonth.times(i)).plus(10));
        await vesting.withdrawFromVesting(vestingId + 1, {
          from: OTHER_ADDR,
        });
        assert.equal(await token.balanceOf(OTHER_ADDR), i * 25);
      }
    });

    it('should successfully transfer tokens', async () => {
      const contractTokensBefore = toBN(await token.balanceOf(vesting.address));
      await setCurrentTime(tgeTimestamp.plus(secondsInMonth.times(5)).plus(10));

      await vesting.withdrawFromVesting(vestingId, {
        from: OTHER_ADDR,
      });
      const contractTokensAfter = toBN(await token.balanceOf(vesting.address));
      const userTokensAfter = toBN(await token.balanceOf(OTHER_ADDR));

      assert.equal(contractTokensAfter.toString(), contractTokensBefore.minus(100).toString());
      assert.equal(userTokensAfter.toString(), 100);
    });

    it('should change vesting object', async () => {
      await setCurrentTime(tgeTimestamp.plus(secondsInMonth.times(5)).plus(10));

      await vesting.withdrawFromVesting(vestingId, {
        from: OTHER_ADDR,
      });
      const vestingData = await vesting.getVestingById(vestingId);
      assert.equal(vestingData.paidAmount, 100);
    });

    it('should emit valid vesting withdraw event', async () => {
      await setCurrentTime(tgeTimestamp.plus(secondsInMonth.times(5)).plus(10));

      const tx = await vesting.withdrawFromVesting(vestingId, {
        from: OTHER_ADDR,
      });

      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'VestingWithdraw');
      assert.equal(tx.logs[0].args.vestingId, vestingId);
      assert.equal(tx.logs[0].args.amount, 100);
    });

    it('should allow empty withdraw of already withdrawn vesting', async () => {
      await setCurrentTime(tgeTimestamp.plus(secondsInMonth.times(5)).plus(10));

      await vesting.withdrawFromVesting(vestingId, {
        from: OTHER_ADDR,
      });
      const tx = await vesting.withdrawFromVesting(vestingId, {
        from: OTHER_ADDR,
      });

      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'VestingWithdraw');
      assert.equal(tx.logs[0].args.vestingId, vestingId);
      assert.equal(tx.logs[0].args.amount, 0);

      assert.equal(await token.balanceOf(OTHER_ADDR), 100);
    });

    it('should lower amount in vesting but do not change tokens available', async () => {
      await setCurrentTime(tgeTimestamp.plus(secondsInMonth.times(5)).plus(10));

      const availableBefore = toBN(await vesting.getTokensAvailable());
      await vesting.withdrawFromVesting(vestingId, {
        from: OTHER_ADDR,
      });

      assert.equal(toBN(await vesting.amountInVestings()).toString(), 0);
      assert.equal(toBN(await vesting.getTokensAvailable()).toString(), availableBefore.toString());
    });
  });

  describe('withdrawExcessiveTokens', async () => {
    beforeEach('setup', async () => {
      await vesting.setToken(token.address);

      await setCurrentTime(6);
      const tx = await vesting.createVesting(OTHER_ADDR, 100, VestingSchedule.ANGELROUND, true);

      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'VestingAdded');
      assert.equal(tx.logs[0].args.vestingId, 0);
    });

    it('should not allow not owner to withdraw excessive tokens', async () => {
      await truffleAssert.reverts(
        vesting.withdrawExcessiveTokens({
          from: OTHER_ADDR,
        }),
        'Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.',
      );
    });

    it('should transfer right amount of tokens', async () => {
      const amountBefore = toBN(await token.balanceOf(vesting.address));
      await vesting.withdrawExcessiveTokens();
      assert.equal(await token.balanceOf(vesting.address), 100);
      assert.equal(toBN(await token.balanceOf(accounts[0])).toString(), amountBefore.minus(100).toString());
    });

    it('should nullify unvested tokens on a contract', async () => {
      await vesting.withdrawExcessiveTokens();

      assert.equal(await vesting.getTokensAvailable(), 0);
    });
  });

  describe('getWithdrawableAmount', async () => {
    const vestingId = 0;

    beforeEach('setup', async () => {
      await vesting.setToken(token.address);

      await vesting.createVesting(OTHER_ADDR, 100, VestingSchedule.ANGELROUND, true);
    });

    it('should not allow to withdraw from canceled vesting', async () => {
      await vesting.cancelVesting(vestingId);
      await truffleAssert.reverts(vesting.getWithdrawableAmount(vestingId), 'Vesting is canceled');
    });

    it('should return valid amount to withdraw before withdrawal', async () => {
      await setCurrentTime(tgeTimestamp.plus(secondsInMonth.times(2)).plus(10));
      assert.equal(await vesting.getWithdrawableAmount(vestingId), 50);
    });

    it('should return valid amount to withdraw after withdrawal', async () => {
      await setCurrentTime(tgeTimestamp.plus(secondsInMonth.times(2)).plus(10));
      await vesting.withdrawFromVesting(0);
      await setCurrentTime(tgeTimestamp.plus(secondsInMonth.times(3)).plus(10));
      assert.equal(await vesting.getWithdrawableAmount(vestingId), 25);
    });
  });

  describe('withdrawFromVestingBulk', async () => {
    beforeEach('setup', async () => {
      await vesting.setToken(token.address);

      await setCurrentTime(tgeTimestamp.plus(secondsInMonth.times(5)).plus(10));

      await vesting.createVesting(OTHER_ADDR, 100, VestingSchedule.ANGELROUND, true);
      await vesting.createVesting(SOME_ADDR_1, 100, VestingSchedule.SEEDROUND, true);
      await vesting.createVesting(SOME_ADDR_2, 100, VestingSchedule.PRIVATEROUND, true);
    });

    it('should withdraw valid amounts', async () => {
      await vesting.withdrawFromVestingBulk(0, 100);
      assert.equal(await token.balanceOf(OTHER_ADDR), 100);
      assert.equal(await token.balanceOf(SOME_ADDR_1), 100);
      assert.equal(await token.balanceOf(SOME_ADDR_2), 100);
    });

    it('should withdraw valid amounts if one canceled', async () => {
      await vesting.cancelVesting(1);

      await vesting.withdrawFromVestingBulk(0, 100);
      assert.equal(await token.balanceOf(OTHER_ADDR), 100);
      assert.equal(await token.balanceOf(SOME_ADDR_1), 0);
      assert.equal(await token.balanceOf(SOME_ADDR_2), 100);
    });

    it('should withdraw valid amounts with subset parameters', async () => {
      await vesting.withdrawFromVestingBulk(0, 1);
      assert.equal(await token.balanceOf(OTHER_ADDR), 100);
      assert.equal(await token.balanceOf(SOME_ADDR_1), 0);
      assert.equal(await token.balanceOf(SOME_ADDR_2), 0);
    });

    it('should withdraw valid amounts with out of bounds parameters', async () => {
      await vesting.withdrawFromVestingBulk(100, 100);
      assert.equal(await token.balanceOf(OTHER_ADDR), 0);
      assert.equal(await token.balanceOf(SOME_ADDR_1), 0);
      assert.equal(await token.balanceOf(SOME_ADDR_2), 0);
    });
  });

  describe('concrete vestings schedules withdrawal', async () => {
    beforeEach('setup', async () => {
      await vesting.setToken(token.address);
    });

    const testAmountByMonthOffset = async (expectedData) => {
      for (const instance of expectedData) {
        const monthOffset = instance[0];
        const expectedTokens = instance[1];
        const offsetSeconds = secondsInMonth.times(monthOffset).plus(10);
        await setCurrentTime(tgeTimestamp.plus(offsetSeconds));
        await vesting.withdrawFromVesting(0);
        const tokenBalance = web3.utils.fromWei((await token.balanceOf(OTHER_ADDR)).toString());
        const roundedTokenBalance = Math.floor(parseFloat(tokenBalance));
        assert.equal(roundedTokenBalance, expectedTokens);
      }
    };

    it('should withdraw from angel round as expected', async () => {
      await vesting.createVesting(OTHER_ADDR, web3.utils.toWei('800000'), VestingSchedule.ANGELROUND, true);
      await testAmountByMonthOffset([
        [-1, 0],
        [0, 0],
        [1, 200000],
        [2, 400000],
        [3, 600000],
        [4, 800000],
        [10, 800000],
      ]);
    });

    it('should withdraw from seed round as expected', async () => {
      await vesting.createVesting(OTHER_ADDR, web3.utils.toWei('2240000'), VestingSchedule.SEEDROUND, true);
      await testAmountByMonthOffset([
        [-1, 0],
        [0, 560000],
        [1, 1680000],
        [2, 2240000],
        [10, 2240000],
      ]);
    });

    it('should withdraw from private round as expected', async () => {
      await vesting.createVesting(OTHER_ADDR, web3.utils.toWei('10800000'), VestingSchedule.PRIVATEROUND, true);
      await testAmountByMonthOffset([
        [-1, 0],
        [0, 2700000],
        [1, 5400000],
        [2, 8100000],
        [3, 10800000],
        [10, 10800000],
      ]);
    });

    it('should withdraw from listings as expected', async () => {
      await vesting.createVesting(OTHER_ADDR, web3.utils.toWei('5000000'), VestingSchedule.LISTINGS, true);
      await testAmountByMonthOffset([
        [-1, 0],
        [0, 3000000],
        [1, 5000000],
        [10, 5000000],
      ]);
    });

    it('should withdraw from growth as expected', async () => {
      await vesting.createVesting(OTHER_ADDR, web3.utils.toWei('13000000'), VestingSchedule.GROWTH, true);
      await testAmountByMonthOffset([
        [-1, 0],
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 650000],
        [4, 1300000],
        [5, 1950000],
        [23, 13000000],
        [40, 13000000],
      ]);
    });

    it('should withdraw from founders as expected', async () => {
      await vesting.createVesting(OTHER_ADDR, web3.utils.toWei('16000000'), VestingSchedule.FOUNDERS, true);
      await testAmountByMonthOffset([
        [-1, 0],
        [0, 160000],
        [1, 160000 + 633600],
        [4, 160000 + 633600 * 4],
        [25, 16000000],
        [50, 16000000],
      ]);
    });

    it('should withdraw from developers as expected', async () => {
      await vesting.createVesting(OTHER_ADDR, web3.utils.toWei('8000000'), VestingSchedule.DEVELOPERS, true);
      await testAmountByMonthOffset([
        [-1, 0],
        [0, 320000],
        [1, 640000],
        [4, 1600000],
        [25, 8000000],
        [50, 8000000],
      ]);
    });

    it('should withdraw from bug finding as expected', async () => {
      await vesting.createVesting(OTHER_ADDR, web3.utils.toWei('2000000'), VestingSchedule.BUGFINDING, true);
      await testAmountByMonthOffset([
        [-1, 0],
        [0, 0],
        [1, 1000000],
        [2, 1000000],
        [3, 2000000],
        [10, 2000000],
      ]);
    });

    it('should withdraw from vault as expected', async () => {
      await vesting.createVesting(OTHER_ADDR, web3.utils.toWei('10000000'), VestingSchedule.VAULT, true);
      await testAmountByMonthOffset([
        [-1, 0],
        [0, 0],
        [1, 500000],
        [2, 1000000],
        [5, 2500000],
        [20, 10000000],
        [40, 10000000],
      ]);
    });

    it('should withdraw from second adviser custom as expected', async () => {
      await vesting.createVesting(OTHER_ADDR, web3.utils.toWei('1396000'), VestingSchedule.ADVISORSCUSTOMFIRST, true);
      await testAmountByMonthOffset([
        [-1, 0],
        [0, 369000],
        [1, 369000 + 102333],
        [2, 369000 + 102333 + 102333],
        [3, 369000 + 102333 + 102333 + 102333],
        [4, 369000 + 102333 + 102333 + 102333 + 252933],
        [5, 369000 + 102333 + 102333 + 102333 + 252933 + 252933],
        [6, 369000 + 102333 + 102333 + 102333 + 252933 + 252933 + 214135],
        [10, 1396000],
      ]);
    });

    it('should withdraw from first adviser custom as expected', async () => {
      await vesting.createVesting(OTHER_ADDR, web3.utils.toWei('3200000'), VestingSchedule.ADVISORSCUSTOMSECOND, true);
      await testAmountByMonthOffset([
        [-1, 0],
        [0, 0],
        [1, 266667 - 1],
        [2, 266667 * 2 - 1],
        [3, 266667 * 3 - 1],
        [12, 3200000],
        [20, 3200000],
      ]);
    });
  });
});

function toBN(number) {
  return new BigNumber(number);
}
