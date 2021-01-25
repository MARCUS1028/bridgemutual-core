const TokenContract = artifacts.require('BMIToken');
const VestingContract = artifacts.require('BMITokenVesting');

// TODO fill with final timestamp
const tokenGenerationTimestamp = 1609325103;

module.exports = async (deployer) => {
  await deployer.deploy(VestingContract, tokenGenerationTimestamp);
  const vesting = await VestingContract.deployed();
  await deployer.deploy(TokenContract, vesting.address);
  const token = await TokenContract.deployed();
  await vesting.setToken(token.address);
};
