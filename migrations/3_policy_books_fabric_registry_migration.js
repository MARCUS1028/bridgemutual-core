const DAI = artifacts.require('./Mock/DAIMock');

const PolicyBook = artifacts.require('PolicyBook');
const PolicyBookFabric = artifacts.require('PolicyBookFabric');
const PolicyBookRegistry = artifacts.require('PolicyBookRegistry');

const ContractType = {
  STABLECOIN: 0,
  DEFI: 1,
  CONTRACT: 2,
  EXCHANGE: 3,
};

module.exports = async (deployer, network, accounts) => {
  const BOOK = accounts[0];

  await deployer.deploy(DAI, 'dai', 'dai');
  const dai = await DAI.deployed();

  await deployer.deploy(PolicyBook, BOOK, ContractType.DEFI, dai.address, '', '');
  await deployer.deploy(PolicyBook, BOOK, ContractType.CONTRACT, dai.address, '', '');
  await deployer.deploy(PolicyBook, BOOK, ContractType.EXCHANGE, dai.address, '', '');

  await deployer.deploy(PolicyBookRegistry);
  const policyBookRegistry = await PolicyBookRegistry.deployed();

  await deployer.deploy(PolicyBookFabric, policyBookRegistry.address, dai.address);
  const policyBookFabric = await PolicyBookFabric.deployed();

  await policyBookRegistry.setPolicyFabricAddress(policyBookFabric.address);
};