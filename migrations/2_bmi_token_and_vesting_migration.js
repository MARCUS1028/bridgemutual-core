const {deployProxy} = require('@openzeppelin/truffle-upgrades');

const TokenContract = artifacts.require('BMIToken');
const VestingContract = artifacts.require('BMITokenVesting');

// TODO fill with final timestamp
const tokenGenerationTimestamp = 1609325103;

module.exports = async (deployer) => {
  await deployProxy(VestingContract, [tokenGenerationTimestamp], {deployer});
  const vesting = await VestingContract.deployed();
  await deployProxy(TokenContract, [vesting.address], {deployer});
  const token = await TokenContract.deployed();
  await vesting.setToken(token.address);
};
