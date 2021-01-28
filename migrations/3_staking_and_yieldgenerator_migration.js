const ContractsRegistry = artifacts.require('ContractsRegistry');

const DAIMock = artifacts.require('mock/DAIMock');
const BMIToken = artifacts.require("BMIToken");
const BMIDAIStaking = artifacts.require('BMIDAIStaking');
const DefiYieldGenerator = artifacts.require('DefiYieldGenerator');

module.exports = async (deployer) => {
    await deployer.deploy(ContractsRegistry);
    const contractsRegistry = await ContractsRegistry.deployed();    

    await deployer.deploy(DAIMock, 'mockDAI', 'MDAI');
    const daiMock = await DAIMock.deployed();

    await deployer.deploy(BMIDAIStaking);
    const bmiDaiStaking = await BMIDAIStaking.deployed();

    await deployer.deploy(DefiYieldGenerator);
    const defiYieldGenerator = await DefiYieldGenerator.deployed();

    const bmiToken = await BMIToken.deployed();

    await contractsRegistry.addContractRegistry((await contractsRegistry.getDAIName.call()), daiMock.address);
    await contractsRegistry.addContractRegistry((await contractsRegistry.getBMIName.call()), bmiToken.address);  
    await contractsRegistry.addContractRegistry((await contractsRegistry.getBMIDAIStakingName.call()), bmiDaiStaking.address);  
    await contractsRegistry.addContractRegistry((await contractsRegistry.getYieldGeneratorName.call()), defiYieldGenerator.address);  

    await bmiDaiStaking.initRegistry(contractsRegistry.address);
    await defiYieldGenerator.initRegistry(contractsRegistry.address);

    await bmiDaiStaking.makeDefiYieldGeneratorApproveStakingWithdrowal();
}