const BigNumber = require('bignumber.js');
const {deployProxy} = require('@openzeppelin/truffle-upgrades');
const Wallet = require('ethereumjs-wallet').default;

const Reverter = require('./helpers/reverter');
const {sign2612} = require('./helpers/signatures');
const {MAX_UINT256} = require('./helpers/constants');

const BMIToken = artifacts.require('BMIToken.sol');

contract('BMIToken', async (accounts) => {
  const reverter = new Reverter(web3);

  const VEST_ADDR = accounts[0];
  const OTHER_USER = accounts[1];
  let token;

  before('setup', async () => {
    token = await deployProxy(BMIToken, [VEST_ADDR]);

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

  describe('permit functionality', async () => {
    it('should change allowance through permit', async () => {
      const wallet = Wallet.generate();
      const walletAddress = wallet.getAddressString();
      const amount = toBN(10).pow(25);
      const contractData = {name: 'BridgeMutual Insurance', verifyingContract: token.address};
      const transactionData = {
        owner: walletAddress,
        spender: OTHER_USER,
        value: amount,
      };
      const {v, r, s} = sign2612(contractData, transactionData, wallet.getPrivateKey());

      await token.permit(
        walletAddress, OTHER_USER, amount.toString(10), MAX_UINT256.toString(10), v, r, s, {from: OTHER_USER},
      );
      assert.equal(toBN(await token.allowance(walletAddress, OTHER_USER)).toString(), amount.toString());
    });
  });
});

function toBN(number) {
  return new BigNumber(number);
}
