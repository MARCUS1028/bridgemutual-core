const BMIToken = artifacts.require('BMIToken.sol');

const Reverter = require('./helpers/reverter');
const BigNumber = require('bignumber.js');

contract('BMIToken', async (accounts) => {
  const reverter = new Reverter(web3);

  const VEST_ADDR = accounts[0];
  let token;

  before('setup', async () => {
    token = await BMIToken.new(VEST_ADDR);

    await reverter.snapshot();
  });

  afterEach('revert', reverter.revert);

  describe('contract details', async () => {
    it('should deploy with correct name', async () => {
      assert.equal(await token.name(), 'BridgeMutual Insurance');
    });

    it('should deploy with correct symbol', async () => {
      assert.equal(await token.symbol(), 'BMI');
    });

    it('should deploy with correct decimals', async () => {
      assert.equal(await token.decimals(), 18);
    });
  });

  describe('initial distribution', async () => {
    const totalSupply = toBN(10).pow(25).times(16);

    it('should deploy with expected total supply', async () => {
      assert.equal(toBN(await token.totalSupply()).toString(), totalSupply.toString());
    });

    it('should deploy giving expected amount to vesting', async () => {
      assert.equal(toBN(await token.balanceOf(VEST_ADDR)).toString(), totalSupply.toString());
    });
  });
});

function toBN(number) {
  return new BigNumber(number);
}
