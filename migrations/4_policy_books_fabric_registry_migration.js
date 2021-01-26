const DAIMock = artifacts.require('mock/DAIMock');

const ContractsRegistry = artifacts.require('ContractsRegistry');
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

  const contractsRegistry = await ContractsRegistry.deployed();  

  const daiMock = await DAIMock.deployed();

  await deployer.deploy(PolicyBookRegistry);
  const policyBookRegistry = await PolicyBookRegistry.deployed();   

  await deployer.deploy(PolicyBookFabric);
  const policyBookFabric = await PolicyBookFabric.deployed();

  await contractsRegistry.addContractRegistry((await contractsRegistry.getPolicyBookRegistryName.call()), policyBookRegistry.address);  
  await contractsRegistry.addContractRegistry((await contractsRegistry.getPolicyBookFabricName.call()), policyBookFabric.address);  

  await policyBookFabric.initRegistry(contractsRegistry.address);
  await policyBookRegistry.initRegistry(contractsRegistry.address);

  const emptyPolicyBookAddress = (await policyBookFabric.create(mockInsuranceContractAddress1, ContractType.DEFI, 'mock1', '1')).logs[2].args.at;  
  const smallPolicyBookAddress = (await policyBookFabric.create(mockInsuranceContractAddress2, ContractType.CONTRACT, 'mock2', '2')).logs[2].args.at;  
  const bigPolicyBookAddress = (await policyBookFabric.create(mockInsuranceContractAddress3, ContractType.EXCHANGE, 'mock3', '3')).logs[2].args.at;
  
  const emptyPolicyBook = await PolicyBook.at(emptyPolicyBookAddress);
  const smallPolicyBook = await PolicyBook.at(smallPolicyBookAddress);
  const bigPolicyBook = await PolicyBook.at(bigPolicyBookAddress);

  const smallLiquidity = 100;
  const bigLiquidity = 1000000;

  await daiMock.approve(emptyPolicyBookAddress, 0);
  await daiMock.approve(smallPolicyBookAddress, smallLiquidity);
  await daiMock.approve(bigPolicyBookAddress, bigLiquidity);

  await emptyPolicyBook.addLiquidity(0); // just to show
  await smallPolicyBook.addLiquidity(smallLiquidity);
  await bigPolicyBook.addLiquidity(bigLiquidity);

  console.log(emptyPolicyBookAddress + " - empty PolicyBook\n");
  console.log(smallPolicyBookAddress + " - small PolicyBook with " + smallLiquidity + " DAI\n");
  console.log(bigPolicyBookAddress + " - big PolicyBook with " + bigLiquidity + " DAI\n");
};