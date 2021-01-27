const {deployProxy} = require('@openzeppelin/truffle-upgrades');

const TokenContract = artifacts.require('BMIToken');

// TODO fill with final data
const ownerAddress = '0x0000000000000000000000000000000000000003';

module.exports = async (deployer) => {
  await deployProxy(TokenContract, [ownerAddress], {deployer});
};
