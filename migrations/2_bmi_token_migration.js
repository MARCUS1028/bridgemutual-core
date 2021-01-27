const {deployProxy} = require('@openzeppelin/truffle-upgrades');

const TokenContract = artifacts.require('BMIToken');

module.exports = async (deployer) => {
  await deployProxy(TokenContract, [], {deployer, initializer: false});
};
