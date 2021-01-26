const BMIDAIStaking = artifacts.require('BMIDAIStaking');
const DefiYieldGenerator = artifacts.require('DefiYieldGenerator');
const ContractsRegistry = artifacts.require('ContractsRegistry');
const PolicyBookFabric = artifacts.require('PolicyBookFabric');
const PolicyBookRegistry = artifacts.require('PolicyBookRegistry');
const PolicyBookMock = artifacts.require('./mock/PolicyBookMock');
const DAIMock = artifacts.require('./mock/DAIMock');
const BMIToken = artifacts.require('BMIToken');
const VestingContract = artifacts.require('BMITokenVesting');

const { assert } = require('chai');
const truffleAssert = require('truffle-assertions');

const ContractType = {
    STABLECOIN: 0,
    DEFI: 1,
    CONTRACT: 2,
    EXCHANGE: 3,
};

contract.only('BMIDAIStaking', async (accounts) => {

    const MAIN = accounts[0];
    const HELP = accounts[1];

    describe('stakeDAIx', async () => {  
        let daiMock;
        let policyBook;
        let bmiDaiStaking;

        before('setup', async () => {
            const mockInsuranceContractAddress1 = '0x0000000000000000000000000000000000000001';

            const contractsRegistry = await ContractsRegistry.new();            
            const defiYieldGenerator = await DefiYieldGenerator.new();
            const policyBookRegistry = await PolicyBookRegistry.new();            
            const policyBookFabric = await PolicyBookFabric.new();                
            const vesting = await VestingContract.new();                
            const bmiToken = await BMIToken.new(vesting.address);            
            daiMock = await DAIMock.new('mockDAI', 'MDAI');
            bmiDaiStaking = await BMIDAIStaking.new();

            await vesting.setToken(bmiToken.address);

            await contractsRegistry.addContractRegistry((await contractsRegistry.getDAIName.call()), daiMock.address);
            await contractsRegistry.addContractRegistry((await contractsRegistry.getBMIName.call()), bmiToken.address);  
            await contractsRegistry.addContractRegistry((await contractsRegistry.getBmiDAIStakingName.call()), bmiDaiStaking.address);
            await contractsRegistry.addContractRegistry((await contractsRegistry.getYieldGeneratorName.call()), defiYieldGenerator.address);
            await contractsRegistry.addContractRegistry((await contractsRegistry.getPolicyBookRegistryName.call()), policyBookRegistry.address);
            await contractsRegistry.addContractRegistry((await contractsRegistry.getPolicyBookFabricName.call()), policyBookFabric.address);   

            await policyBookFabric.initRegistry(contractsRegistry.address);
            await policyBookRegistry.initRegistry(contractsRegistry.address);
            await bmiDaiStaking.initRegistry(contractsRegistry.address);
            await defiYieldGenerator.initRegistry(contractsRegistry.address);

            const policyBookAddress = (await policyBookFabric.create(mockInsuranceContractAddress1, ContractType.DEFI, 'mock1', '1')).logs[2].args.at;
            policyBook = await PolicyBookMock.at(policyBookAddress);
            
            const liquidity = 1000000;

            await daiMock.approve(policyBookAddress, liquidity);          
            await policyBook.addLiquidity(liquidity);
        });    
        
        it('should fail due to insufficient balance', async () => {
            await truffleAssert.reverts(bmiDaiStaking.stakeDAIx(1000, policyBook.address, { from: HELP }), "ERC20: transfer amount exceeds balance");
        });

        it('should mint new NFT', async () => {
            await policyBook.approve(bmiDaiStaking.address, 1000);

            await bmiDaiStaking.stakeDAIx(1000, policyBook.address);            

            assert.equal(await bmiDaiStaking.howManyStakings(MAIN), 1);
            assert.equal(await policyBook.balanceOfNFT(MAIN), 1);
            assert.equal(await policyBook.ownerOfNFT(2), MAIN);
        });
    });
});
