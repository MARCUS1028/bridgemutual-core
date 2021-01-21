const fs = require('fs');

const MockDAI = artifacts.require('mock/DAIMock');

const MockPolicyBook = artifacts.require('mock/MockPolicyBook');
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
  const mockInsuranceContractAddress1 = '0x0000000000000000000000000000000000000001';
  const mockInsuranceContractAddress2 = '0x0000000000000000000000000000000000000002';
  const mockInsuranceContractAddress3 = '0x0000000000000000000000000000000000000003';

  await deployer.deploy(MockDAI, 'mockDAI', 'MDAI');
  const mockDai = await MockDAI.deployed();

  await deployer.deploy(PolicyBookRegistry);
  const policyBookRegistry = await PolicyBookRegistry.deployed();  

  await deployer.deploy(PolicyBookFabric, policyBookRegistry.address, mockDai.address);
  const policyBookFabric = await PolicyBookFabric.deployed();

  await policyBookRegistry.setPolicyFabricAddress(policyBookFabric.address);

  const emptyPolicyBookAddress = (await policyBookFabric.create(mockInsuranceContractAddress1, ContractType.DEFI, 'mock1', '1')).logs[0].args.at;
  const smallPolicyBookAddress = (await policyBookFabric.create(mockInsuranceContractAddress2, ContractType.CONTRACT, 'mock2', '2')).logs[0].args.at;
  const bigPolicyBookAddress = (await policyBookFabric.create(mockInsuranceContractAddress3, ContractType.EXCHANGE, 'mock3', '3')).logs[0].args.at;
  
  const emptyPolicyBook = await PolicyBook.at(emptyPolicyBookAddress);
  const smallPolicyBook = await PolicyBook.at(smallPolicyBookAddress);
  const bigPolicyBook = await PolicyBook.at(bigPolicyBookAddress);

  const smallLiquidity = 100;
  const bigLiquidity = 1000000;

  await mockDai.approve(emptyPolicyBookAddress, 0);
  await mockDai.approve(smallPolicyBookAddress, smallLiquidity);
  await mockDai.approve(bigPolicyBookAddress, bigLiquidity);

  await emptyPolicyBook.addLiquidity(0); // just to show
  await smallPolicyBook.addLiquidity(smallLiquidity);
  await bigPolicyBook.addLiquidity(bigLiquidity);

  console.log(emptyPolicyBookAddress + " - empty PolicyBook\n");
  console.log(smallPolicyBookAddress + " - small PolicyBook with " + smallLiquidity + " DAI\n");
  console.log(bigPolicyBookAddress + " - big PolicyBook with " + bigLiquidity + " DAI\n");
};