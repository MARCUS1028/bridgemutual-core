/*global web3*/
const BN = require("bn.js");

const constants = require("../constants/vesting");

const TokenContract = artifacts.require("BMIToken");
const VestingContract = artifacts.require("BMITokenVesting");

module.exports = async (deployer) => {
  await deployer.deploy(VestingContract);
  const vesting = await VestingContract.deployed();
  await deployer.deploy(TokenContract, vesting.address);
  const token = await TokenContract.deployed();
  await vesting.setToken(token.address);

  await fillVestings(vesting);
};

async function fillVestings(vestingContract) {
  const createVesting = async (
    beneficiary,
    amount,
    amountPerPeriod,
    {
      firstPeriodImmediatelyReady = false,
      delayInMonth = 0,
      periodInMonth = 1,
      cliffInPeriods = 0,
      isCancelable = false,
    } = {}
  ) => {
    const secondsInMonth = 60 * 60 * 24 * 30;
    let startDate = constants.tokenGenerationTimestamp + delayInMonth * secondsInMonth;
    if (firstPeriodImmediatelyReady) {
      startDate -= periodInMonth * secondsInMonth;
    }

    const parameters = [
      beneficiary,
      web3.utils.toWei(amount, "ether"),
      startDate,
      periodInMonth,
      web3.utils.toWei(amountPerPeriod, "ether"),
      cliffInPeriods,
      isCancelable,
    ];
    console.log(`Deploying vesting with parameters ${parameters.join(", ")}`);
    const tx = await vestingContract.createVesting(...parameters);
    console.log(`Transaction: ${tx.tx}`);
  };

  const _ = (numberString) => new BN(numberString);

  const angelRoundAmount = _("800000");
  await createVesting(constants.angelRoundAddress, angelRoundAmount, angelRoundAmount.div(_("2")), {
    firstPeriodImmediatelyReady: true,
  });

  const seedRoundAmount = _("2240000");
  await createVesting(constants.seedRoundAddress, seedRoundAmount.div(_("2")), seedRoundAmount.div(_("4")), {
    firstPeriodImmediatelyReady: true,
    periodInMonth: 2,
  });
  await createVesting(constants.seedRoundAddress, seedRoundAmount.div(_("2")), seedRoundAmount.div(_("2")));

  const privateRoundAmount = _("10800000");
  await createVesting(constants.privateRoundAddress, privateRoundAmount, privateRoundAmount.div(_("4")), {
    firstPeriodImmediatelyReady: true,
  });

  const listingsAmount = _("5000000");
  await createVesting(constants.listingsAddress, listingsAmount, listingsAmount, {
    firstPeriodImmediatelyReady: true,
  });

  const liquidityMiningAmount = _("60000000");
  await createVesting(constants.liquidityMiningAddress, liquidityMiningAmount, liquidityMiningAmount.div(_("10")), {
    firstPeriodImmediatelyReady: true,
  });

  const growthAmount = _("14000000");
  await createVesting(
    constants.growthAddress,
    growthAmount.div(_("100")).mul(_("27")),
    growthAmount.div(_("100")).mul(_("3")),
    {
      cliffInPeriods: 3,
    }
  );
  await createVesting(
    constants.growthAddress,
    growthAmount.div(_("100")).mul(_("73")),
    growthAmount.div(_("100")).mul(_("2")),
    {
      delayInMonth: 9,
    }
  );

  const staffingAmount = _("2500000");
  await createVesting(
    constants.staffingAddress,
    staffingAmount.div(_("100")).mul(_("60")),
    staffingAmount.div(_("100")).mul(_("5")),
    { cliffInPeriods: 1 }
  );
  await createVesting(
    constants.staffingAddress,
    staffingAmount.div(_("100")).mul(_("40")),
    staffingAmount.div(_("100")).mul(_("3")),
    {
      delayInMonth: 12,
    }
  );

  const operationalAmount = _("3000000");
  await createVesting(constants.operationalAddress, operationalAmount, operationalAmount.div(_("100")));

  const marketingAmount = _("9500000");
  await createVesting(constants.marketingAddress, marketingAmount, marketingAmount.div(_("100")));

  const discretionaryAmount = _("1160000");
  await createVesting(
    constants.discretionaryAddress,
    discretionaryAmount,
    discretionaryAmount.div(_("100").mul(_("5"))),
    { cliffInPeriods: 3 }
  );

  const protectionAmount = _("9000000");
  await createVesting(constants.protectionAddress, protectionAmount, protectionAmount.div(_("100").mul(_("2"))), {
    cliffInPeriods: 12,
  });

  const foundersAmount = _("16000000");
  await createVesting(constants.foundersAddress, foundersAmount, foundersAmount.div(_("100").mul(_("4"))));

  const developersAmount = _("8000000");
  await createVesting(constants.developersAddress, developersAmount, developersAmount.div(_("100").mul(_("4"))));

  const advisorsAmount = _("6000000");
  await createVesting(
    constants.advisorsAddress,
    advisorsAmount.div(_("100")).mul(_("60")),
    advisorsAmount.div(_("100")).mul(_("12")),
    {
      firstPeriodImmediatelyReady: true,
    }
  );
  await createVesting(
    constants.advisorsAddress,
    advisorsAmount.div(_("100")).mul(_("40")),
    advisorsAmount.div(_("10000")).mul(_("866")),
    { delayInMonth: 4 }
  );

  const bugFindingAmount = _("2000000");
  await createVesting(constants.bugFindingAddress, bugFindingAmount, bugFindingAmount.div(_("2")), {
    firstPeriodImmediatelyReady: true,
    periodInMonth: 3,
  });

  const vaultAmount = _("10000000");
  await createVesting(
    constants.vaultAddress,
    vaultAmount.div(_("100")).mul(_("25")),
    vaultAmount.div(_("100")).mul(_("5")),
    { cliffInPeriods: 1 }
  );
  await createVesting(
    constants.vaultAddress,
    vaultAmount.div(_("100")).mul(_("75")),
    vaultAmount.div(_("100")).mul(_("4")),
    { delayInMonth: 5 }
  );
}
