const {deployProxy} = require('@openzeppelin/truffle-upgrades');

const TokenContract = artifacts.require('BMIToken');
const VestingContract = artifacts.require('BMITokenVesting');

// TODO fill with final data
const tokenGenerationTimestamp = 1609325103;

module.exports = async (deployer) => {
  await deployProxy(VestingContract, [tokenGenerationTimestamp], {deployer});
  const vesting = await VestingContract.deployed();
  const token = await TokenContract.deployed();
  await vesting.setToken(token.address);
};
