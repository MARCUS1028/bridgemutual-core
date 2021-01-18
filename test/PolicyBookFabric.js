const PolicyBookFabric = artifacts.require('PolicyBookFabric');
const PolicyBook = artifacts.require('PolicyBook');
const PolicyBookRegistry = artifacts.require('PolicyBookRegistry');
const DAI = artifacts.require('DAIMock');

const Reverter = require('./helpers/reverter');
const truffleAssert = require('truffle-assertions');

const ContractType = {
  STABLECOIN: 0,
  DEFI: 1,
  CONTRACT: 2,
  EXCHANGE: 3,
};

contract('PolicyBookFabric', async (accounts) => {
  const reverter = new Reverter(web3);

  let policyBookRegistry;
  let policyBookFabric;
  let dai;

  const CONTRACT1 = accounts[0];
  const CONTRACT2 = accounts[1];
  const CONTRACT3 = accounts[2];

  before('setup', async () => {
    dai = await DAI.new('dai', 'dai');
    policyBookRegistry = await PolicyBookRegistry.new();
    policyBookFabric = await PolicyBookFabric.new(policyBookRegistry.address, dai.address);
    await policyBookRegistry.setPolicyFabricAddress(policyBookFabric.address);

    await reverter.snapshot();
  });

  afterEach('revert', reverter.revert);

  describe('create', async () => {
    it('should instantiate contract at saved address', async () => {
      await policyBookFabric.create(CONTRACT1, ContractType.DEFI);
      const address = await policyBookFabric.policyBookFor(CONTRACT1);
      const book = await PolicyBook.at(address);
      assert.equal(await book.getContractAddress(), CONTRACT1);
      assert.equal(await book.getContractType(), ContractType.DEFI);
    });

    it('should emit created event', async () => {
      const result = await policyBookFabric.create(CONTRACT1, ContractType.DEFI);
      const address = await policyBookFabric.policyBookFor(CONTRACT1);

      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].event, 'Created');
      assert.equal(result.logs[0].args.insured, CONTRACT1);
      assert.equal(result.logs[0].args.contractType, ContractType.DEFI);
      assert.equal(result.logs[0].args.at, address);
    });

    it('should not allow to create dublicate by the same address', async () => {
      await policyBookFabric.create(CONTRACT1, ContractType.DEFI);
      await truffleAssert.reverts(policyBookFabric.create(CONTRACT1, ContractType.DEFI),
        'PolicyBook for the contract is already created');
    });

    it('should add policy to registry', async () => {
      const result = await policyBookFabric.create(CONTRACT1, 1);
      const bookAddress = result.logs[0].args.at;
      assert.equal(await policyBookRegistry.policyBookFor(CONTRACT1), bookAddress);
    });

    it('should increase count of books', async () => {
      assert.equal(await policyBookFabric.policyBooksCount(), 0);
      await policyBookFabric.create(CONTRACT1, ContractType.STABLECOIN);
      assert.equal(await policyBookFabric.policyBooksCount(), 1);
    });
  });

  describe('getBooks', async () => {
    let bookAddrArr;

    beforeEach('setup', async () => {
      const book1 = await policyBookFabric.create(CONTRACT1, ContractType.STABLECOIN);
      const book2 = await policyBookFabric.create(CONTRACT2, ContractType.DEFI);
      const book3 = await policyBookFabric.create(CONTRACT3, ContractType.CONTRACT);
      assert.equal(await policyBookFabric.policyBooksCount(), 3);

      bookAddrArr = [book1.logs[0].args.at, book2.logs[0].args.at, book3.logs[0].args.at];
    });

    it('should return valid if inside range', async () => {
      const result = await policyBookFabric.policyBooks(0, 3);
      assert.equal(result[0], 3);
      assert.deepEqual(result[1], bookAddrArr);
    });

    it('should return valid longer than range', async () => {
      const result = await policyBookFabric.policyBooks(1, 3);
      assert.equal(result[0], 2);
      assert.deepEqual(result[1], bookAddrArr.slice(1, 3));
    });

    it('should return valid outside of range', async () => {
      const result = await policyBookFabric.policyBooks(3, 10);
      assert.equal(result[0], 0);
      assert.deepEqual(result[1], []);
    });
  });
});
