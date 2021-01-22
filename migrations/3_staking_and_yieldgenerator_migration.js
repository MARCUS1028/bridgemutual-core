const ContractsRegistry = artifacts.require('ContractsRegistry');

const BmiDAIStaking = artifacts.require('BmiDAIStaking');
const DefiYieldGenerator = artifacts.require('DefiYieldGenerator');

module.exports = async (deployer) => {
    await deployer.deploy(ContractsRegistry);
    const contractsRegistry = await ContractsRegistry.deployed();

    await deployer.deploy(BmiDAIStaking);
    const bmiDaiStaking = await BmiDAIStaking.deployed();

    await deployer.deploy(DefiYieldGenerator);
    const defiYieldGenerator = await DefiYieldGenerator.deployed();

    await contractsRegistry.addContractRegistry((await contractsRegistry.getBmiDAIStakingName.call()), bmiDaiStaking.address);  
    await contractsRegistry.addContractRegistry((await contractsRegistry.getYieldGeneratorName.call()), defiYieldGenerator.address);  
}