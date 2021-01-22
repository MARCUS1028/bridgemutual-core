const PolicyBookRegistry = artifacts.require('PolicyBookRegistry');
const ContractsRegistry = artifacts.require('ContractsRegistry');

const Reverter = require('./helpers/reverter');
const truffleAssert = require('truffle-assertions');

contract('PolicyBookRegistry', async (accounts) => {
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const reverter = new Reverter(web3);

  let policyBookRegistry;
  let contractsRegistry;
  let policyBookFabric;

  const NON_OWNER = accounts[1];
  const FABRIC = accounts[2];
  const NON_FABRIC = accounts[3];

  before('setup', async () => {
    contractsRegistry = await ContractsRegistry.new();  
    policyBookRegistry = await PolicyBookRegistry.new();    

    await contractsRegistry.addContractRegistry((await contractsRegistry.getPolicyBookRegistryName.call()), policyBookRegistry.address);
    await contractsRegistry.addContractRegistry((await contractsRegistry.getPolicyBookFabricName.call()), FABRIC);

    await policyBookRegistry.initRegistry(contractsRegistry.address);

    await reverter.snapshot();
  });

  afterEach('revert', reverter.revert);

  describe('setPolicyBookFabricAddress', async () => {
    it('should not allow not owner to set', async () => {
      await contractsRegistry.addContractRegistry((await contractsRegistry.getPolicyBookFabricName.call()), FABRIC);  
      await truffleAssert.reverts(policyBookRegistry.initRegistry(contractsRegistry.address, {from: NON_OWNER}),
        'Ownable: caller is not the owner');
    });

    it('should actually set address', async () => {
      await contractsRegistry.addContractRegistry((await contractsRegistry.getPolicyBookFabricName.call()), NON_FABRIC);  
      await policyBookRegistry.initRegistry(contractsRegistry.address);
      await assert.equal(await policyBookRegistry.policyBookFabricAddress(), NON_FABRIC);
    });
  });

  describe('add', async () => {
    const CONTRACT = accounts[3];
    const BOOK1 = accounts[4];
    const BOOK2 = accounts[5];

    it('should not allow not fabric to add', async () => {
      await truffleAssert.reverts(policyBookRegistry.add(CONTRACT, BOOK1, {from: NON_FABRIC}),
        'Caller is not a PolicyBookFabric contract');
    });

    it('should not allow to add dublicate by the same address', async () => {
      await policyBookRegistry.add(CONTRACT, BOOK1, {from: FABRIC});
      await truffleAssert.reverts(policyBookRegistry.add(CONTRACT, BOOK2, {from: FABRIC}),
        'PolicyBook for the contract is already created');
    });

    it('should emit added event', async () => {
      const result = await policyBookRegistry.add(CONTRACT, BOOK1, {from: FABRIC});
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].event, 'Added');
      assert.equal(result.logs[0].args.insured, CONTRACT);
      assert.equal(result.logs[0].args.at, BOOK1);
    });

    it('should increase count of books', async () => {
      assert.equal(await policyBookRegistry.count(), 0);
      await policyBookRegistry.add(CONTRACT, BOOK1, {from: FABRIC});
      assert.equal(await policyBookRegistry.count(), 1);
    });

    it('should save policy book by address', async () => {
      assert.equal(await policyBookRegistry.policyBookFor(CONTRACT), zeroAddress);
      await policyBookRegistry.add(CONTRACT, BOOK1, {from: FABRIC});
      assert.equal(await policyBookRegistry.policyBookFor(CONTRACT), BOOK1);
    });

    it('should save policy book', async () => {
      assert.deepEqual((await policyBookRegistry.list(0, 10))[1], []);
      await policyBookRegistry.add(CONTRACT, BOOK1, {from: FABRIC});
      assert.deepEqual((await policyBookRegistry.list(0, 10))[1], [BOOK1]);
    });
  });

  describe('getBooks', async () => {
    const contracts = accounts.slice(3, 6);
    const bookAddresses = accounts.slice(6, 9);

    beforeEach('setup', async () => {
      for (let i = 0; i < 3; i++) {
        await policyBookRegistry.add(contracts[i], bookAddresses[i], {from: FABRIC});
      }
    });

    it('should return valid if inside range', async () => {
      const result = await policyBookRegistry.list(0, 3);
      assert.equal(result[0], 3);
      assert.deepEqual(result[1], bookAddresses);
    });

    it('should return valid longer than range', async () => {
      const result = await policyBookRegistry.list(1, 3);
      assert.equal(result[0], 2);
      assert.deepEqual(result[1], bookAddresses.slice(1, 3));
    });

    it('should return valid longer than range', async () => {
      const result = await policyBookRegistry.list(3, 10);
      assert.equal(result[0], 0);
      assert.deepEqual(result[1], []);
    });
  });
});
