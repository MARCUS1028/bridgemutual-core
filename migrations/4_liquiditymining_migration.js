const LiquidityMining = artifacts.require('LiquidityMining.sol');
const ContractsRegistry = artifacts.require('ContractsRegistry.sol');
const LiquidityMiningNFT = artifacts.require('LiquidityMiningNFT.sol');

module.exports = async (deployer) => {
    const contractsRegistry = await ContractsRegistry.deployed();  
    
    await deployer.deploy(LiquidityMiningNFT, ''); 
    const liquidityMiningNFT = await LiquidityMiningNFT.deployed();

    await deployer.deploy(LiquidityMining);
    const liquidityMining = await LiquidityMining.deployed();

    await contractsRegistry.addContractRegistry(
        (await contractsRegistry.getLiquidityMiningNFTName.call()), liquidityMiningNFT.address);
    await contractsRegistry.addContractRegistry(
        (await contractsRegistry.getLiquidityMiningName.call()), liquidityMining.address);

    await liquidityMining.initRegistry(contractsRegistry.address);
};