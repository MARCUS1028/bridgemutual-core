const TokenContract = artifacts.require('BMIToken');

// TODO fill with final data
const tokenOwnerAddress = '0x0000000000000000000000000000000000000001';

module.exports = async (deployer) => {
  await deployer.deploy(TokenContract, tokenOwnerAddress);
};
