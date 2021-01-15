/*global contract, web3*/
const BN = require("bn.js");
const { expectRevert } = require("@openzeppelin/test-helpers");
const timeMachine = require("ganache-time-traveler");
require("chai").use(require("chai-as-promised")).use(require("chai-bn")(BN)).should();

const constants = require("../constants/vesting");

const BMIToken = artifacts.require("BMIToken.sol");
const BMITokenVesting = artifacts.require("BMITokenVesting.sol");

contract("BMITokenVesting", async ([deployer, otherAddress, otherAddress2]) => {
  const deployContracts = async () => {
    const vesting = await BMITokenVesting.new().should.be.fulfilled;
    const token = await BMIToken.new(vesting.address).should.be.fulfilled;

    return [vesting, token];
  };

  const deployReadyToUseContract = async () => {
    const [vesting, token] = await deployContracts();
    await vesting.setToken(token.address).should.be.fulfilled;
    return [vesting, token];
  };

  const deployContractWithVesting = async ({
    address = otherAddress,
    amount = "100",
    startDate = getNowTimestamp() - 5,
    periodInMonth = 1,
    amountPerPeriod = "25",
    cliffInPeriods = 0,
    isCancelable = true,
  } = {}) => {
    const [vesting, token] = await deployReadyToUseContract();
    const tx = await vesting.createVesting(
      address,
      amount,
      startDate,
      periodInMonth,
      amountPerPeriod,
      cliffInPeriods,
      isCancelable
    ).should.be.fulfilled;
    const vestingId = getVestingId(tx);
    return [vesting, vestingId, token];
  };

  const secondsInMonth = 60 * 60 * 24 * 30;

  const getNowTimestamp = () => Math.round(Date.now() / 1000);

  const getTokenSetEvent = (tx) => tx.logs.find((x) => x.event == "TokenSet").args;
  const getVestingAddEvent = (tx) => tx.logs.find((x) => x.event == "VestingAdded").args;
  const getVestingCancelEvent = (tx) => tx.logs.find((x) => x.event == "VestingCanceled").args;
  const getVestingWithdrawalEvent = (tx) => tx.logs.find((x) => x.event == "VestingWithdraw").args;

  const getVestingId = (tx) => getVestingAddEvent(tx).vestingId;

  let snapshotId;

  beforeEach(async () => {
    const snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
  });

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  describe("# BMITokenVesting contract set token", async () => {
    it("should allow owner to set token", async () => {
      const [vesting, token] = await deployContracts();

      await vesting.setToken(token.address).should.be.fulfilled;
    });

    it("shouldn't allow not owner to set token", async () => {
      const [vesting, token] = await deployContracts();

      await expectRevert(
        vesting.setToken(token.address, {
          from: otherAddress,
        }),
        "Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner."
      );
    });

    it("shouldn't allow to change token", async () => {
      const [vesting, token] = await deployContracts();

      await vesting.setToken(token.address).should.be.fulfilled;
      await expectRevert(vesting.setToken(otherAddress), "token is already set");
    });

    it("should emit valid set token event", async () => {
      const [vesting, token] = await deployContracts();

      const tx = await vesting.setToken(token.address).should.be.fulfilled;
      getTokenSetEvent(tx).token.should.be.equal(token.address);
    });
  });

  describe("# BMITokenVesting contract create vesting", async () => {
    it("shouldn't allow not owner to create vesting", async () => {
      const [vesting] = await deployReadyToUseContract();

      await expectRevert(
        vesting.createVesting(otherAddress2, 100, getNowTimestamp(), 1, 25, 0, true, {
          from: otherAddress,
        }),
        "Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner."
      );
    });

    it("shouldn't allow to create vesting larger than tokens available", async () => {
      const [vesting, token] = await deployReadyToUseContract();
      const tokensLeft = await token.balanceOf(vesting.address);

      await expectRevert(
        vesting.createVesting(otherAddress, tokensLeft + new BN("1"), getNowTimestamp(), 1, 25, 0, true),
        "Not enough tokens"
      );
    });

    it("shouldn't allow to create vesting larger than tokens left available", async () => {
      const [vesting, token] = await deployReadyToUseContract();
      const tokensLeft = await token.balanceOf(vesting.address);

      await vesting.createVesting(otherAddress, tokensLeft, getNowTimestamp(), 1, 25, 0, true).should.be.fulfilled;
      await expectRevert(
        vesting.createVesting(otherAddress, "1", getNowTimestamp(), 1, 25, 0, true),
        "Not enough tokens"
      );
    });

    it("should add amount to amount in vesting", async () => {
      const [vesting] = await deployReadyToUseContract();

      (await vesting.amountInVestings()).should.be.bignumber.equal("0");
      await vesting.createVesting(otherAddress, 100, getNowTimestamp(), 1, 25, 0, true).should.be.fulfilled;
      (await vesting.amountInVestings()).should.be.bignumber.equal("100");
    });

    it("should create valid vesting instance", async () => {
      const [vesting] = await deployReadyToUseContract();
      const startDate = getNowTimestamp();

      const tx = await vesting.createVesting(otherAddress, "100", startDate, 1, 25, 0, true).should.be.fulfilled;
      const vestingId = getVestingId(tx);
      const vestingData = await vesting.getVestingById(vestingId);
      vestingData.isValid.should.be.true;
      vestingData.beneficiary.should.be.equal(otherAddress);
      vestingData.amount.should.be.bignumber.equal("100");
      vestingData.startDate.should.be.bignumber.equal(String(startDate));
      vestingData.periodInMonth.should.be.bignumber.equal("1");
      vestingData.amountPerPeriod.should.be.bignumber.equal("25");
      vestingData.cliffInPeriods.should.be.bignumber.equal("0");
      vestingData.paidAmount.should.be.bignumber.equal("0");
      vestingData.isCancelable.should.be.true;
    });

    it("should emit valid vesting add event", async () => {
      const [vesting] = await deployReadyToUseContract();
      const tx = await vesting.createVesting(otherAddress, 100, getNowTimestamp(), 1, 25, 0, true).should.be.fulfilled;

      getVestingAddEvent(tx).vestingId.should.be.bignumber.equal("0");
    });

    it("should emit successive ids", async () => {
      const [vesting] = await deployReadyToUseContract();

      for (let i = 0; i < 5; i++) {
        const tx = await vesting.createVesting(otherAddress, 100, getNowTimestamp(), 1, 25, 0, true).should.be
          .fulfilled;
        getVestingId(tx).should.be.bignumber.equal(String(i));
      }
    });
  });

  describe("# BMITokenVesting contract cancel vesting", async () => {
    it("shouldn't allow not owner to cancel vesting", async () => {
      const [vesting, vestingId] = await deployContractWithVesting();

      await expectRevert(
        vesting.cancelVesting(vestingId, {
          from: otherAddress,
        }),
        "Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner."
      );
    });

    it("shouldn't allow to cancel nonexistent vesting", async () => {
      const [vesting, vestingId] = await deployContractWithVesting();

      await expectRevert(vesting.cancelVesting(vestingId + 1), "Vesting doesnt exist or canceled");
    });

    it("shouldn't allow to cancel already canceled vesting", async () => {
      const [vesting, vestingId] = await deployContractWithVesting();

      await vesting.cancelVesting(vestingId).should.be.fulfilled;
      await expectRevert(vesting.cancelVesting(vestingId), "Vesting doesnt exist or canceled");
    });

    it("shouldn't allow to cancel non cancelable vesting", async () => {
      const [vesting, vestingId] = await deployContractWithVesting({
        isCancelable: false,
      });

      await expectRevert(vesting.cancelVesting(vestingId), "Vesting is not cancelable");
    });

    it("should invalidate vesting", async () => {
      const [vesting, vestingId] = await deployContractWithVesting();

      await vesting.cancelVesting(vestingId).should.be.fulfilled;
      const vestingData = await vesting.getVestingById(vestingId);
      vestingData.isValid.should.be.false;
    });

    it("should emit valid vesting canceled event", async () => {
      const [vesting, vestingId] = await deployContractWithVesting();

      const tx = await vesting.cancelVesting(vestingId).should.be.fulfilled;
      const event = getVestingCancelEvent(tx);
      event.vestingId.should.be.bignumber.equal(vestingId);
    });

    it("should lower amount in vesting", async () => {
      const [vesting, vestingId] = await deployContractWithVesting();

      await vesting.cancelVesting(vestingId).should.be.fulfilled;
      (await vesting.amountInVestings()).should.be.bignumber.equal("0");
    });

    it("should lower amount in vesting for partly paid vesting", async () => {
      const [vesting, vestingId] = await deployContractWithVesting();
      await timeMachine.advanceTimeAndBlock(2 * secondsInMonth);
      await vesting.withdrawFromVesting(vestingId, {
        from: otherAddress,
      });

      (await vesting.amountInVestings()).should.be.bignumber.equal("50");
      await vesting.cancelVesting(vestingId).should.be.fulfilled;
      (await vesting.amountInVestings()).should.be.bignumber.equal("0");
    });
  });

  describe("# BMITokenVesting contract withdraw from vesting", async () => {
    it("shouldn't allow to withdraw invalid vesting", async () => {
      const [vesting, vestingId] = await deployContractWithVesting();

      await expectRevert(vesting.withdrawFromVesting(vestingId + 1), "Vesting doesnt exist or canceled");
    });

    it("should not withdraw anything if called too early", async () => {
      const [vesting, vestingId, token] = await deployContractWithVesting();

      await vesting.withdrawFromVesting(vestingId, { from: otherAddress });

      (await token.balanceOf(otherAddress)).should.be.bignumber.equal("0");
    });

    it("should not withdraw anything on a cliff period", async () => {
      const [vesting, vestingId, token] = await deployContractWithVesting({
        periodInMonth: 2,
        cliffInPeriods: 2,
      });
      await timeMachine.advanceTimeAndBlock(5 * secondsInMonth);

      await vesting.withdrawFromVesting(vestingId, { from: otherAddress });

      (await token.balanceOf(otherAddress)).should.be.bignumber.equal("0");
    });

    it("should withdraw right amount after cliff end", async () => {
      const [vesting, vestingId, token] = await deployContractWithVesting({
        periodInMonth: 2,
        cliffInPeriods: 2,
      });
      await timeMachine.advanceTimeAndBlock(6 * secondsInMonth);

      await vesting.withdrawFromVesting(vestingId, { from: otherAddress });

      (await token.balanceOf(otherAddress)).should.be.bignumber.equal("75");
    });

    it("should withdraw right amount on successive withdrawals", async () => {
      const [vesting, vestingId, token] = await deployContractWithVesting({
        periodInMonth: 2,
      });

      for (let i = 1; i < 5; i++) {
        await timeMachine.advanceTimeAndBlock(2 * secondsInMonth);
        await vesting.withdrawFromVesting(vestingId, { from: otherAddress });
        (await token.balanceOf(otherAddress)).should.be.bignumber.equal(String(i * 25));
      }
    });

    it("should successfully transfer tokens", async () => {
      const [vesting, vestingId, token] = await deployContractWithVesting();
      const contractTokensBefore = await token.balanceOf(vesting.address);
      await timeMachine.advanceTimeAndBlock(5 * secondsInMonth);

      await vesting.withdrawFromVesting(vestingId, {
        from: otherAddress,
      });
      const contractTokensAfter = await token.balanceOf(vesting.address);
      const userTokensAfter = await token.balanceOf(otherAddress);
      contractTokensAfter.should.be.bignumber.equal(contractTokensBefore.sub(new BN("100")));
      userTokensAfter.should.be.bignumber.equal(new BN("100"));
    });

    it("should change vesting object", async () => {
      const [vesting, vestingId] = await deployContractWithVesting();
      await timeMachine.advanceTimeAndBlock(5 * secondsInMonth);

      await vesting.withdrawFromVesting(vestingId, {
        from: otherAddress,
      });
      const vestingData = await vesting.getVestingById(vestingId);
      vestingData.paidAmount.should.be.bignumber.equal("100");
    });

    it("should emit valid vesting withdraw event", async () => {
      const [vesting, vestingId] = await deployContractWithVesting();
      await timeMachine.advanceTimeAndBlock(5 * secondsInMonth);

      const tx = await vesting.withdrawFromVesting(vestingId, {
        from: otherAddress,
      });
      const event = getVestingWithdrawalEvent(tx);
      event.vestingId.should.be.bignumber.equal(vestingId);
      event.amount.should.be.bignumber.equal("100");
    });

    it("should allow empty withdraw of already withdrawn vesting", async () => {
      const [vesting, vestingId, token] = await deployContractWithVesting();
      await timeMachine.advanceTimeAndBlock(5 * secondsInMonth);

      await vesting.withdrawFromVesting(vestingId, {
        from: otherAddress,
      });
      const tx = await vesting.withdrawFromVesting(vestingId, {
        from: otherAddress,
      });
      const event = getVestingWithdrawalEvent(tx);
      event.amount.should.be.bignumber.equal("0");
      (await token.balanceOf(otherAddress)).should.be.bignumber.equal("100");
    });

    it("should lower amount in vesting but do not change tokens available", async () => {
      const [vesting, vestingId] = await deployContractWithVesting();
      await timeMachine.advanceTimeAndBlock(5 * secondsInMonth);

      const availableBefore = await vesting.getTokensAvailable();
      await vesting.withdrawFromVesting(vestingId, {
        from: otherAddress,
      });
      (await vesting.amountInVestings()).should.be.bignumber.equal("0");
      (await vesting.getTokensAvailable()).should.be.bignumber.equal(availableBefore);
    });
  });

  describe("# BMITokenVesting contract withdraw excessive tokens", async () => {
    it("shouldn't allow not owner to withdraw excessive tokens", async () => {
      const [vesting] = await deployContractWithVesting();

      await expectRevert(
        vesting.withdrawExcessiveTokens({
          from: otherAddress,
        }),
        "Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner."
      );
    });

    it("should transfer right amount of tokens", async () => {
      const [vesting, , token] = await deployContractWithVesting();

      const amountBefore = await token.balanceOf(vesting.address);
      await vesting.withdrawExcessiveTokens();
      (await token.balanceOf(vesting.address)).should.be.bignumber.equal("100");
      (await token.balanceOf(deployer)).should.be.bignumber.equal(amountBefore.sub(new BN("100")));
    });

    it("should nullify unvested tokens on a contract", async () => {
      const [vesting] = await deployContractWithVesting();

      await vesting.withdrawExcessiveTokens();
      (await vesting.getTokensAvailable()).should.be.bignumber.equal("0");
    });
  });

  describe("# BMITokenVesting after migration", async () => {
    it("should contain expected token amount", async () => {
      const vesting = await BMITokenVesting.deployed();
      const token = await BMIToken.deployed();
      (await token.balanceOf(vesting.address)).should.be.bignumber.equal(web3.utils.toWei(new BN("160000000")));
    });

    it("should reference deployed token contract", async () => {
      const vesting = await BMITokenVesting.deployed();
      const token = await BMIToken.deployed();
      (await vesting.token()).should.be.equal(token.address);
    });

    it("should not have unvested tokens", async () => {
      const vesting = await BMITokenVesting.deployed();

      (await vesting.getTokensAvailable()).should.be.bignumber.equal("0");
    });

    it("should have expected vestings count", async () => {
      const vesting = await BMITokenVesting.deployed();
      (await vesting.vestingCount()).should.be.bignumber.equal("21");
    });

    it("should contain angel round vesting with id 0 and with expected behaviour", async () => {
      const vesting = await BMITokenVesting.deployed();
      const token = await BMIToken.deployed();
      const vestingId = 0;

      const vestingData = await vesting.getVestingById(vestingId);
      vestingData.beneficiary.should.be.equal(constants.angelRoundAddress);

      await timeMachine.advanceBlockAndSetTime(constants.tokenGenerationTimestamp + 5);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.angelRoundAddress)).should.be.bignumber.equal(
        web3.utils.toWei(new BN("400000"))
      );

      await timeMachine.advanceTimeAndBlock(secondsInMonth);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.angelRoundAddress)).should.be.bignumber.equal(
        web3.utils.toWei(new BN("800000"))
      );
    });

    it("should contain seed round vesting with expected behaviour", async () => {
      const vesting = await BMITokenVesting.deployed();
      const token = await BMIToken.deployed();
      const vestingId = 1;

      const vestingData = await vesting.getVestingById(vestingId);
      vestingData.beneficiary.should.be.equal(constants.seedRoundAddress);

      await timeMachine.advanceBlockAndSetTime(constants.tokenGenerationTimestamp + 5);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.seedRoundAddress)).should.be.bignumber.equal(web3.utils.toWei(new BN("560000")));

      await timeMachine.advanceTimeAndBlock(secondsInMonth * 2);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.seedRoundAddress)).should.be.bignumber.equal(
        web3.utils.toWei(new BN("1120000"))
      );
    });

    it("should contain private round vesting with expected behaviour", async () => {
      const vesting = await BMITokenVesting.deployed();
      const token = await BMIToken.deployed();
      const vestingId = 3;

      const vestingData = await vesting.getVestingById(vestingId);
      vestingData.beneficiary.should.be.equal(constants.privateRoundAddress);

      await timeMachine.advanceBlockAndSetTime(constants.tokenGenerationTimestamp + 5);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.privateRoundAddress)).should.be.bignumber.equal(
        web3.utils.toWei(new BN("2700000"))
      );

      await timeMachine.advanceTimeAndBlock(secondsInMonth);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.privateRoundAddress)).should.be.bignumber.equal(
        web3.utils.toWei(new BN("5400000"))
      );
    });

    it("should contain listings vesting with expected behaviour", async () => {
      const vesting = await BMITokenVesting.deployed();
      const token = await BMIToken.deployed();
      const vestingId = 4;

      const vestingData = await vesting.getVestingById(vestingId);
      vestingData.beneficiary.should.be.equal(constants.listingsAddress);

      await timeMachine.advanceBlockAndSetTime(constants.tokenGenerationTimestamp);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.listingsAddress)).should.be.bignumber.equal(web3.utils.toWei(new BN("5000000")));

      await timeMachine.advanceTimeAndBlock(secondsInMonth);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.listingsAddress)).should.be.bignumber.equal(web3.utils.toWei(new BN("5000000")));
    });

    it("should contain liquidity mining vesting with expected behaviour", async () => {
      const vesting = await BMITokenVesting.deployed();
      const token = await BMIToken.deployed();
      const vestingId = 5;

      const vestingData = await vesting.getVestingById(vestingId);
      vestingData.beneficiary.should.be.equal(constants.liquidityMiningAddress);

      await timeMachine.advanceBlockAndSetTime(constants.tokenGenerationTimestamp + 5);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.liquidityMiningAddress)).should.be.bignumber.equal(
        web3.utils.toWei(new BN("6000000"))
      );

      await timeMachine.advanceTimeAndBlock(secondsInMonth);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.liquidityMiningAddress)).should.be.bignumber.equal(
        web3.utils.toWei(new BN("12000000"))
      );
    });

    it("should contain growth vesting with cliffInPeriods-3 with expected behaviour", async () => {
      const vesting = await BMITokenVesting.deployed();
      const token = await BMIToken.deployed();
      const vestingId = 6;

      const vestingData = await vesting.getVestingById(vestingId);
      vestingData.beneficiary.should.be.equal(constants.growthAddress);

      await timeMachine.advanceBlockAndSetTime(constants.tokenGenerationTimestamp);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.growthAddress)).should.be.bignumber.equal(web3.utils.toWei(new BN("0")));

      await timeMachine.advanceTimeAndBlock(secondsInMonth * 3);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.growthAddress)).should.be.bignumber.equal(web3.utils.toWei(new BN("0")));

      await timeMachine.advanceTimeAndBlock(secondsInMonth);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.growthAddress)).should.be.bignumber.equal(web3.utils.toWei(new BN("1680000")));
    });

    it("should contain staffingAddress vesting with delayInMonth-12 with expected behaviour", async () => {
      const vesting = await BMITokenVesting.deployed();
      const token = await BMIToken.deployed();
      const vestingId = 9;

      const vestingData = await vesting.getVestingById(vestingId);
      vestingData.beneficiary.should.be.equal(constants.staffingAddress);

      await timeMachine.advanceBlockAndSetTime(constants.tokenGenerationTimestamp + secondsInMonth * 12);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.staffingAddress)).should.be.bignumber.equal(web3.utils.toWei(new BN("0")));

      await timeMachine.advanceTimeAndBlock(secondsInMonth);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.staffingAddress)).should.be.bignumber.equal(web3.utils.toWei(new BN("75000")));
    });

    it("should contain bugFindingAddress vesting with expected behaviour", async () => {
      const vesting = await BMITokenVesting.deployed();
      const token = await BMIToken.deployed();
      const vestingId = 18;

      const vestingData = await vesting.getVestingById(vestingId);
      vestingData.beneficiary.should.be.equal(constants.bugFindingAddress);

      await timeMachine.advanceBlockAndSetTime(constants.tokenGenerationTimestamp);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.bugFindingAddress)).should.be.bignumber.equal(
        web3.utils.toWei(new BN("1000000"))
      );

      await timeMachine.advanceTimeAndBlock(secondsInMonth * 3);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.bugFindingAddress)).should.be.bignumber.equal(
        web3.utils.toWei(new BN("2000000"))
      );

      await timeMachine.advanceTimeAndBlock(secondsInMonth * 7);
      await vesting.withdrawFromVesting(vestingId);
      (await token.balanceOf(constants.bugFindingAddress)).should.be.bignumber.equal(
        web3.utils.toWei(new BN("2000000"))
      );
    });
  });
});
