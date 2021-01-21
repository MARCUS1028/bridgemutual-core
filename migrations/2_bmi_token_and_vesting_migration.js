const BN = require('bn.js');

const TokenContract = artifacts.require('BMIToken');
const VestingContract = artifacts.require('BMITokenVesting');

// TODO fill with final timestamp
const tokenGenerationTimestamp = 1609325103;

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
    } = {},
  ) => {
    const secondsInMonth = 60 * 60 * 24 * 30;
    let startDate = tokenGenerationTimestamp + delayInMonth * secondsInMonth;
    if (firstPeriodImmediatelyReady) {
      startDate -= periodInMonth * secondsInMonth;
    }

    const parameters = [
      beneficiary,
      web3.utils.toWei(amount, 'ether'),
      startDate,
      periodInMonth,
      web3.utils.toWei(amountPerPeriod, 'ether'),
      cliffInPeriods,
      isCancelable,
    ];
    console.log(`Deploying vesting with parameters ${parameters.join(', ')}`);
    const gas = await vestingContract.createVesting.estimateGas(...parameters);
    console.log(`Gas: ${gas}`);
    const tx = await vestingContract.createVesting(...parameters);
    console.log(`Transaction: ${tx.tx}`);
  };

  const _ = (numberString) => new BN(numberString);

  const createAngelRoundVesting = async (address, amount) => {
    await createVesting(address, amount, amount.div(_('2')), {
      firstPeriodImmediatelyReady: true,
    });
  };

  const createSeedRoundVesting = async (address, amount) => {
    await createVesting(address, amount.div(_('2')), amount.div(_('4')), {
      firstPeriodImmediatelyReady: true,
      periodInMonth: 2,
    });
    await createVesting(address, amount.div(_('2')), amount.div(_('2')));
  };

  const createPrivateRoundVesting = async (address, amount) => {
    await createVesting(address, amount, amount.div(_('4')), {
      firstPeriodImmediatelyReady: true,
    });
  };

  const createListingsVesting = async (address, amount) => {
    await createVesting(address, amount, amount, {
      firstPeriodImmediatelyReady: true,
    });
  };

  const createLiquidityMiningVesting = async (address, amount) => {
    await createVesting(address, amount, amount.div(_('10')), {
      firstPeriodImmediatelyReady: true,
    });
  };

  const createGrowthVesting = async (address, amount) => {
    await createVesting(
      address,
      amount.div(_('100')).mul(_('27')),
      amount.div(_('100')).mul(_('3')),
      {
        cliffInPeriods: 3,
      },
    );
    await createVesting(
      address,
      amount.div(_('100')).mul(_('73')),
      amount.div(_('100')).mul(_('2')),
      {
        delayInMonth: 9,
      },
    );
  };

  const createStaffingVesting = async (address, amount) => {
    await createVesting(
      address,
      amount.div(_('100')).mul(_('60')),
      amount.div(_('100')).mul(_('5')),
      {cliffInPeriods: 1},
    );
    await createVesting(
      address,
      amount.div(_('100')).mul(_('40')),
      amount.div(_('100')).mul(_('3')),
      {
        delayInMonth: 12,
      },
    );
  };

  const createOperationalVesting = async (address, amount) => {
    await createVesting(address, amount, amount.div(_('100')));
  };

  const createMarketingVesting = async (address, amount) => {
    await createVesting(address, amount, amount.div(_('100')));
  };

  const createDiscretionaryVesting = async (address, amount) => {
    await createVesting(
      address,
      amount,
      amount.div(_('100').mul(_('5'))),
      {cliffInPeriods: 3},
    );
  };

  const createProtectionVesting = async (address, amount) => {
    await createVesting(address, amount, amount.div(_('100').mul(_('2'))), {
      cliffInPeriods: 12,
    });
  };

  const createFoundersVesting = async (address, amount) => {
    await createVesting(address, amount, amount.div(_('100').mul(_('4'))));
  };

  const createDevelopersVesting = async (address, amount) => {
    await createVesting(address, amount, amount.div(_('100').mul(_('4'))));
  };

  const createAdvisorsVesting = async (address, amount) => {
    await createVesting(
      address,
      amount.div(_('100')).mul(_('60')),
      amount.div(_('100')).mul(_('12')),
      {
        firstPeriodImmediatelyReady: true,
      },
    );
    await createVesting(
      address,
      amount.div(_('100')).mul(_('40')),
      amount.div(_('10000')).mul(_('866')),
      {delayInMonth: 4},
    );
  };

  const createBugFindingVesting = async (address, amount) => {
    await createVesting(address, amount, amount.div(_('2')), {
      firstPeriodImmediatelyReady: true,
      periodInMonth: 3,
    });
  };

  const createVaultVesting = async (address, amount) => {
    await createVesting(
      address,
      amount.div(_('100')).mul(_('25')),
      amount.div(_('100')).mul(_('5')),
      {cliffInPeriods: 1},
    );
    await createVesting(
      address,
      amount.div(_('100')).mul(_('75')),
      amount.div(_('100')).mul(_('4')),
      {delayInMonth: 5},
    );
  };

  const angelRoundAmount = _('800000');
  const seedRoundAmount = _('2240000');
  const privateRoundAmount = _('10800000');
  const listingsAmount = _('5000000');
  const liquidityMiningAmount = _('60000000');
  const growthAmount = _('14000000');
  const staffingAmount = _('2500000');
  const operationalAmount = _('3000000');
  const marketingAmount = _('9500000');
  const discretionaryAmount = _('1160000');
  const protectionAmount = _('9000000');
  const foundersAmount = _('16000000');
  const developersAmount = _('8000000');
  const advisorsAmount = _('6000000');
  const bugFindingAmount = _('2000000');
  const vaultAmount = _('10000000');

  const angelRoundAddress = '0x4E17feEdcfE414c1A9830085e4094326A3F31bBb';
  const seedRoundAddress = '0x56b15901E3b92eFd7003d67D16771229cE2F59b2';
  const privateRoundAddress = '0x9179b9FdA00BE0be47cB4210563f57D529583510';
  const listingsAddress = '0xB275bBc2acC7F0098846CC554997068a1dA3dC5a';
  const liquidityMiningAddress = '0xB3370c4FdC4Ec8cCdE213568173092Ff46b4569A';
  const growthAddress = '0x84117c4ed346ab5b4f9C00ab21711b5224B51E2E';
  const staffingAddress = '0xc34a5FE8Ac892E3B8C1BE81397DdD32d561f79B8';
  const operationalAddress = '0xb02892EC6C57cdF1EC7cE5Aaf7D1C41f11C00875';
  const marketingAddress = '0x7047a2a42EbE896DC5555BA1B3701D595f45FCFE';
  const discretionaryAddress = '0x9307044D869813c1673FB3C641c8B4e5A72A7718';
  const protectionAddress = '0x1Ffb615734960D4A7D4FE81b3A0a56fa813BD046';
  const foundersAddress = '0xd6F7f85A85aFAa1120E7A5Ec6c6362095E72e4A5';
  const developersAddress = '0xa5304fD334F3Ef87044B147dAfF9435816f6caaF';
  const advisorsAddress = '0x02d2D1891c5B2B9c1d0e9b3E45c8980D9191ec3C';
  const bugFindingAddress = '0xF80e151bCA7362EF505Ae517De2afA5943097C71';
  const vaultAddress = '0xc9a2b1293936fD415c6A27547915Aa6D78b5597e';

  await createAngelRoundVesting(angelRoundAddress, angelRoundAmount);
  await createSeedRoundVesting(seedRoundAddress, seedRoundAmount);
  await createPrivateRoundVesting(privateRoundAddress, privateRoundAmount);
  await createListingsVesting(listingsAddress, listingsAmount);
  await createLiquidityMiningVesting(liquidityMiningAddress, liquidityMiningAmount);
  await createGrowthVesting(growthAddress, growthAmount);
  await createStaffingVesting(staffingAddress, staffingAmount);
  await createOperationalVesting(operationalAddress, operationalAmount);
  await createMarketingVesting(marketingAddress, marketingAmount);
  await createDiscretionaryVesting(discretionaryAddress, discretionaryAmount);
  await createProtectionVesting(protectionAddress, protectionAmount);
  await createFoundersVesting(foundersAddress, foundersAmount);
  await createDevelopersVesting(developersAddress, developersAmount);
  await createAdvisorsVesting(advisorsAddress, advisorsAmount);
  await createBugFindingVesting(bugFindingAddress, bugFindingAmount);
  await createVaultVesting(vaultAddress, vaultAmount);
}
