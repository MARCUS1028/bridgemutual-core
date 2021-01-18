const BMIToken = artifacts.require('BMIToken.sol');
const BMITokenVesting = artifacts.require('BMITokenVesting.sol');

const Reverter = require('./helpers/reverter');
const BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');
const setCurrentTime = require('./helpers/ganacheTimeTraveler');
const constants = require('../constants/vesting');

contract('BMITokenVesting', async (accounts) => {
  const reverter = new Reverter(web3);

  const secondsInMonth = toBN(60).times(60).times(24).times(30);

  const OTHER_ADDR = accounts[1];
  let token;
  let vesting;

  before('setup', async () => {
    vesting = await BMITokenVesting.new();
    token = await BMIToken.new(vesting.address);

    await reverter.snapshot();
  });

  afterEach('revert', reverter.revert);

  describe('setToken', async () => {
    it('should allow owner to set token', async () => {
      await vesting.setToken(token.address);
    });

    it('should not allow not owner to set token', async () => {
      await truffleAssert.reverts(vesting.setToken(token.address, {from: OTHER_ADDR}),
        'Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.');
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
      await truffleAssert.reverts(vesting.createVesting(OTHER_ADDR, 100, 1, 1, 25, 0, true, {from: OTHER_ADDR}),
        'Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.');
    });

    it('should not allow to create vesting larger than tokens available', async () => {
      const tokensLeft = toBN(await token.balanceOf(vesting.address));

      await truffleAssert.reverts(vesting.createVesting(OTHER_ADDR, tokensLeft.plus(1), 1, 1, 25, 0, true),
        'Not enough tokens');
    });

    it('should not allow to create vesting larger than tokens left available', async () => {
      const tokensLeft = await token.balanceOf(vesting.address);

      await vesting.createVesting(OTHER_ADDR, tokensLeft, 1, 1, 25, 0, true);
      await truffleAssert.reverts(vesting.createVesting(OTHER_ADDR, toBN(10), 1, 1, 25, 0, true),
        'Not enough tokens');
    });

    it('should add amount to amount in vesting', async () => {
      assert.equal(await vesting.amountInVestings(), 0);
      await vesting.createVesting(OTHER_ADDR, 100, 1, 1, 25, 0, true);
      assert.equal(await vesting.amountInVestings(), 100);
    });

    it('should create valid vesting instance', async () => {
      const startDate = 1;
      const vestingId = 0;

      const tx = await vesting.createVesting(OTHER_ADDR, 100, startDate, 1, 25, 0, true);
      assert.equal(tx.logs[0].event, 'VestingAdded');
      assert.equal(tx.logs[0].args.vestingId, vestingId);

      const vestingData = await vesting.getVestingById(vestingId);
      assert.equal(vestingData.isValid, true);
      assert.equal(vestingData.beneficiary, OTHER_ADDR);
      assert.equal(vestingData.amount, 100);
      assert.equal(vestingData.startDate, startDate);
      assert.equal(vestingData.periodInMonth, 1);
      assert.equal(vestingData.amountPerPeriod, 25);
      assert.equal(vestingData.cliffInPeriods, 0);
      assert.equal(vestingData.paidAmount, 0);
      assert.equal(vestingData.isCancelable, true);
    });

    it('should emit valid vesting add event', async () => {
      const tx = await vesting.createVesting(OTHER_ADDR, 100, 1, 1, 25, 0, true);

      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'VestingAdded');
      assert.equal(tx.logs[0].args.vestingId, 0);
    });

    it('should emit successive ids', async () => {
      for (let i = 0; i < 5; i++) {
        const tx = await vesting.createVesting(OTHER_ADDR, 100, 1, 1, 25, 0, true);
        assert.equal(tx.logs[0].args.vestingId, i);
      }
    });
  });

  describe('cancelVesting', async () => {
    const vestingId = 0;

    beforeEach('setup', async () => {
      await vesting.setToken(token.address);

      await setCurrentTime(6);
      const tx = await vesting.createVesting(OTHER_ADDR, 100, 1, 1, 25, 0, true);

      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'VestingAdded');
      assert.equal(tx.logs[0].args.vestingId, 0);
    });

    it('should not allow not owner to cancel vesting', async () => {
      await truffleAssert.reverts(vesting.cancelVesting(vestingId, {from: OTHER_ADDR}),
        'Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.');
    });

    it('should not allow to cancel nonexistent vesting', async () => {
      await truffleAssert.reverts(vesting.cancelVesting(vestingId + 1),
        'Vesting doesnt exist or canceled');
    });

    it('should not allow to cancel already canceled vesting', async () => {
      await vesting.cancelVesting(vestingId);
      await truffleAssert.reverts(vesting.cancelVesting(vestingId), 'Vesting doesnt exist or canceled');
    });

    it('should not allow to cancel non cancelable vesting', async () => {
      await vesting.createVesting(OTHER_ADDR, 100, 1, 1, 25, 0, false);

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
      await setCurrentTime(secondsInMonth.times(2).plus(10));
      await vesting.withdrawFromVesting(vestingId, {from: OTHER_ADDR});

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
      const tx = await vesting.createVesting(OTHER_ADDR, 100, 1, 1, 25, 0, true);

      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'VestingAdded');
      assert.equal(tx.logs[0].args.vestingId, 0);
    });

    it('should not allow to withdraw invalid vesting', async () => {
      await truffleAssert.reverts(vesting.withdrawFromVesting(vestingId + 1, {from: OTHER_ADDR}),
        'Vesting doesnt exist or canceled');
    });

    it('should not withdraw anything if called too early', async () => {
      await vesting.withdrawFromVesting(vestingId, {from: OTHER_ADDR});

      assert.equal(await token.balanceOf(OTHER_ADDR), 0);
    });

    it('should not withdraw anything on a cliff period', async () => {
      await vesting.createVesting(OTHER_ADDR, 100, 1, 2, 25, 2, true);

      await setCurrentTime(secondsInMonth.times(5));

      await vesting.withdrawFromVesting(vestingId + 1, {from: OTHER_ADDR});

      assert.equal(await token.balanceOf(OTHER_ADDR), 0);
    });

    it('should withdraw right amount after cliff end', async () => {
      await vesting.createVesting(OTHER_ADDR, 100, 1, 2, 25, 2, true);

      await setCurrentTime(secondsInMonth.times(6).plus(10));

      await vesting.withdrawFromVesting(vestingId + 1, {from: OTHER_ADDR});

      assert.equal(await token.balanceOf(OTHER_ADDR), 75);
    });

    it('should withdraw right amount on successive withdrawals', async () => {
      await vesting.createVesting(OTHER_ADDR, 100, 1, 2, 25, 0, true);

      for (let i = 1; i < 5; i++) {
        await setCurrentTime(secondsInMonth.times(i * 2).plus(10));
        await vesting.withdrawFromVesting(vestingId + 1, {from: OTHER_ADDR});
        assert.equal(await token.balanceOf(OTHER_ADDR), i * 25);
      }
    });

    it('should successfully transfer tokens', async () => {
      const contractTokensBefore = toBN(await token.balanceOf(vesting.address));
      await setCurrentTime(secondsInMonth.times(5));

      await vesting.withdrawFromVesting(vestingId, {from: OTHER_ADDR});
      const contractTokensAfter = toBN(await token.balanceOf(vesting.address));
      const userTokensAfter = toBN(await token.balanceOf(OTHER_ADDR));

      assert.equal(contractTokensAfter.toString(), contractTokensBefore.minus(100).toString());
      assert.equal(userTokensAfter.toString(), 100);
    });

    it('should change vesting object', async () => {
      await setCurrentTime(secondsInMonth.times(5));

      await vesting.withdrawFromVesting(vestingId, {from: OTHER_ADDR});
      const vestingData = await vesting.getVestingById(vestingId);
      assert.equal(vestingData.paidAmount, 100);
    });

    it('should emit valid vesting withdraw event', async () => {
      await setCurrentTime(secondsInMonth.times(5));

      const tx = await vesting.withdrawFromVesting(vestingId, {from: OTHER_ADDR});

      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'VestingWithdraw');
      assert.equal(tx.logs[0].args.vestingId, vestingId);
      assert.equal(tx.logs[0].args.amount, 100);
    });

    it('should allow empty withdraw of already withdrawn vesting', async () => {
      await setCurrentTime(secondsInMonth.times(5));

      await vesting.withdrawFromVesting(vestingId, {from: OTHER_ADDR});
      const tx = await vesting.withdrawFromVesting(vestingId, {from: OTHER_ADDR});

      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'VestingWithdraw');
      assert.equal(tx.logs[0].args.vestingId, vestingId);
      assert.equal(tx.logs[0].args.amount, 0);

      assert.equal(await token.balanceOf(OTHER_ADDR), 100);
    });

    it('should lower amount in vesting but do not change tokens available', async () => {
      await setCurrentTime(secondsInMonth.times(5));

      const availableBefore = toBN(await vesting.getTokensAvailable());
      await vesting.withdrawFromVesting(vestingId, {from: OTHER_ADDR});

      assert.equal(toBN(await vesting.amountInVestings()).toString(), 0);
      assert.equal(toBN(await vesting.getTokensAvailable()).toString(), availableBefore.toString());
    });
  });

  describe('withdrawExcessiveTokens', async () => {
    beforeEach('setup', async () => {
      await vesting.setToken(token.address);

      await setCurrentTime(6);
      const tx = await vesting.createVesting(OTHER_ADDR, 100, 1, 1, 25, 0, true);

      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'VestingAdded');
      assert.equal(tx.logs[0].args.vestingId, 0);
    });

    it('should not allow not owner to withdraw excessive tokens', async () => {
      await truffleAssert.reverts(vesting.withdrawExcessiveTokens({from: OTHER_ADDR}),
        'Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.');
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

  describe('after migration', async () => {
    const startTime = toBN(constants.tokenGenerationTimestamp).plus(5);
    const one = toBN(10).pow(18);
    let vestingDep;
    let tokenDep;

    beforeEach('setup', async () => {
      vestingDep = await BMITokenVesting.deployed();
      tokenDep = await BMIToken.deployed();
    });

    it('should contain expected token amount', async () => {
      assert.equal(toBN(await tokenDep.balanceOf(vestingDep.address)).toString(),
        toBN(10).pow(25).times(16).toString());
    });

    it('should reference deployed token contract', async () => {
      assert.equal(await vestingDep.token(), tokenDep.address);
    });

    it('should not have unvested tokens', async () => {
      assert.equal(await vestingDep.getTokensAvailable(), 0);
    });

    it('should have expected vestings count', async () => {
      assert.equal(await vestingDep.vestingCount(), 21);
    });

    it('should contain angel round vesting with id 0 and with expected behaviour', async () => {
      const vestingId = 0;

      const vestingData = await vestingDep.getVestingById(vestingId);
      assert.equal(vestingData.beneficiary, constants.angelRoundAddress);

      await setCurrentTime(startTime);
      await vestingDep.withdrawFromVesting(vestingId);

      assert.equal(toBN(await tokenDep.balanceOf(constants.angelRoundAddress)).toString(),
        one.times(400000).toString());

      await setCurrentTime(startTime.plus(secondsInMonth));
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.angelRoundAddress)).toString(),
        one.times(800000).toString());
    });

    it('should contain seed round vesting with expected behaviour', async () => {
      const vestingId = 1;

      const vestingData = await vestingDep.getVestingById(vestingId);
      assert.equal(vestingData.beneficiary, constants.seedRoundAddress);

      await setCurrentTime(startTime);
      await vestingDep.withdrawFromVesting(vestingId);

      assert.equal(toBN(await tokenDep.balanceOf(constants.seedRoundAddress)).toString(),
        one.times(560000).toString());

      await setCurrentTime(startTime.plus(secondsInMonth.times(2)));
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.seedRoundAddress)).toString(),
        one.times(1120000).toString());
    });

    it('should contain private round vesting with expected behaviour', async () => {
      const vestingId = 3;

      const vestingData = await vestingDep.getVestingById(vestingId);
      assert.equal(vestingData.beneficiary, constants.privateRoundAddress);

      await setCurrentTime(startTime);
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.privateRoundAddress)).toString(),
        one.times(2700000).toString());

      await setCurrentTime(startTime.plus(secondsInMonth));
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.privateRoundAddress)).toString(),
        one.times(5400000).toString());
    });

    it('should contain listings vesting with expected behaviour', async () => {
      const vestingId = 4;

      const vestingData = await vestingDep.getVestingById(vestingId);
      assert.equal(vestingData.beneficiary, constants.listingsAddress);

      await setCurrentTime(startTime);
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.listingsAddress)).toString(),
        one.times(5000000).toString());

      await setCurrentTime(startTime.plus(secondsInMonth));
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.listingsAddress)).toString(),
        one.times(5000000).toString());
    });

    it('should contain liquidity mining vesting with expected behaviour', async () => {
      const vestingId = 5;

      const vestingData = await vestingDep.getVestingById(vestingId);
      assert.equal(vestingData.beneficiary, constants.liquidityMiningAddress);

      await setCurrentTime(startTime);
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.liquidityMiningAddress)).toString(),
        one.times(6000000).toString());

      await setCurrentTime(startTime.plus(secondsInMonth));
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.liquidityMiningAddress)).toString(),
        one.times(12000000).toString());
    });

    it('should contain staffingAddress vesting with delayInMonth-12 with expected behaviour', async () => {
      const vestingId = 9;

      const vestingData = await vestingDep.getVestingById(vestingId);
      assert.equal(vestingData.beneficiary, constants.staffingAddress);

      await setCurrentTime(startTime.plus(secondsInMonth.times(12)));
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.staffingAddress)).toString(), 0);

      await setCurrentTime(startTime.plus(secondsInMonth.times(13)));
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.staffingAddress)).toString(),
        one.times(75000).toString());
    });

    it('should contain bugFindingAddress vesting with expected behaviour', async () => {
      const vestingId = 18;

      const vestingData = await vestingDep.getVestingById(vestingId);
      assert.equal(vestingData.beneficiary, constants.bugFindingAddress);

      await setCurrentTime(startTime);
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.bugFindingAddress)).toString(),
        one.times(1000000).toString());

      await setCurrentTime(startTime.plus(secondsInMonth.times(3)));
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.bugFindingAddress)).toString(),
        one.times(2000000).toString());

      await setCurrentTime(startTime.plus(secondsInMonth.times(10)));
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.bugFindingAddress)).toString(),
        one.times(2000000).toString());
    });

    it('should contain growth vesting with cliffInPeriods-3 with expected behaviour', async () => {
      const vestingId = 6;

      const vestingData = await vestingDep.getVestingById(vestingId);
      assert.equal(vestingData.beneficiary, constants.growthAddress);

      await setCurrentTime(startTime);
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.growthAddress)).toString(), 0);

      await setCurrentTime(startTime.plus(secondsInMonth.times(3)));
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.growthAddress)).toString(), 0);

      await setCurrentTime(startTime.plus(secondsInMonth.times(4)));
      await vestingDep.withdrawFromVesting(vestingId);
      assert.equal(toBN(await tokenDep.balanceOf(constants.growthAddress)).toString(),
        one.times(1680000).toString());
    });
  });
});

function toBN(number) {
  return new BigNumber(number);
}
