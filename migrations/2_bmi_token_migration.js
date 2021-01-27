const assert = require('assert');
const {deployProxy} = require('@openzeppelin/truffle-upgrades');

const TokenContract = artifacts.require('BMIToken');

// TODO fill with final data
const ownerAddress = '0x0000000000000000000000000000000000000003';

module.exports = async (deployer) => {
  await deployProxy(TokenContract, [ownerAddress], {deployer});
  const token = await TokenContract.deployed();

  await token.transferOwnership(ownerAddress);
  assert((await token.owner()) == ownerAddress);
};
