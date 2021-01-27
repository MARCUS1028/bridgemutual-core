const assert = require('assert');
const {deployProxy} = require('@openzeppelin/truffle-upgrades');

const TokenContract = artifacts.require('BMIToken');
const VestingContract = artifacts.require('BMITokenVesting');

// TODO fill with final data
const tokenGenerationTimestamp = 1609325103;
const ownerAddress = '0x0000000000000000000000000000000000000003';

module.exports = async (deployer) => {
  await deployProxy(VestingContract, [tokenGenerationTimestamp], {deployer});
  const vesting = await VestingContract.deployed();
  const token = await TokenContract.deployed();
  await vesting.setToken(token.address);

  await vesting.transferOwnership(ownerAddress);
  assert((await vesting.owner()) == ownerAddress);
};
