const LiquidityMining = artifacts.require('LiquidityMining.sol');
const LiquidityMiningNFT = artifacts.require('LiquidityMiningNFT.sol');
const ContractsRegistry = artifacts.require('ContractsRegistry');
const BMIDAIStaking = artifacts.require('BMIDAIStaking');
const BMIToken = artifacts.require('BMIToken.sol');
const DAI = artifacts.require('./Mock/DAIMock');
const PolicyBookMock = artifacts.require('./Mock/PolicyBookMock');

const Reverter = require('./helpers/reverter');
const BigNumber = require('bignumber.js');
const {assert} = require('chai');

const setCurrentTime = require('./helpers/ganacheTimeTraveler');
const truffleAssert = require('truffle-assertions');

const ContractType = {
  STABLECOIN: 0,
  DEFI: 1,
  CONTRACT: 2,
  EXCHANGE: 3,
};

contract.skip('LiquidityMining', async (accounts) => {
  const reverter = new Reverter(web3);

  const OWNER = accounts[0];
  const USER1 = accounts[1];
  const USER2 = accounts[2];
  const USER3 = accounts[3];
  const BOOK = accounts[9];
  const endLiquidityMiningTime = toBN(1).plus(1209600); // Now + 2 weeks
  const oneMonth = toBN(2592000);
  const daiAmount = toBN(100000);
  const oneBMI = toBN(10).pow(18);

  let contractsRegistry;
  let liquidityMining;
  let liquidityMiningNFT;
  let bmiToken;
  let dai;
  let policyBookMock;

  before('setup', async () => {
    const bmiDaiStaking = await BMIDAIStaking.new();
    contractsRegistry = await ContractsRegistry.new();
    bmiToken = await BMIToken.new(OWNER);
    dai = await DAI.new('dai', 'dai');

    liquidityMiningNFT = await LiquidityMiningNFT.new('');

    await setCurrentTime(1);
    liquidityMining = await LiquidityMining.new();

    policyBookMock = await PolicyBookMock.new(BOOK, ContractType.CONTRACT);

    await contractsRegistry.addContractRegistry(
      (await contractsRegistry.getLiquidityMiningName.call()), liquidityMining.address);
    await contractsRegistry.addContractRegistry(
      (await contractsRegistry.getLiquidityMiningNFTName.call()), liquidityMiningNFT.address);
    await contractsRegistry.addContractRegistry(
      (await contractsRegistry.getDAIName.call()), dai.address);
    await contractsRegistry.addContractRegistry(
      (await contractsRegistry.getBMIName.call()), bmiToken.address);
    await contractsRegistry.addContractRegistry(
      (await contractsRegistry.getBMIDAIStakingName.call()), bmiDaiStaking.address);

    await liquidityMining.initRegistry(contractsRegistry.address);
    await policyBookMock.initRegistry(contractsRegistry.address);    

    await liquidityMiningNFT.mintNFTsForLM(liquidityMining.address);

    await reverter.snapshot();
  });

  afterEach('revert', reverter.revert);

  describe('investDAI', async () => {
    const investAmount = toBN(1000);

    beforeEach('setup', async () => {
      await dai.transfer(USER1, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER1});

      await dai.transfer(USER2, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER2});
    });

    it('should create new group and invest DAI', async () => {
      const result = await liquidityMining.investDAI(0, investAmount, policyBookMock.address, {from: USER1});

      await checkLeaderboard(liquidityMining, [1]);

      assert.equal(result.logs.length, 2);
      assert.equal(result.logs[1].event, 'DAIInvested');
      assert.equal(result.logs[1].args._groupID, 1);
      assert.equal(result.logs[1].args._tokensAmount, 1000);
      assert.equal(result.logs[1].args._newTotalGroupAmount, 1000);

      assert.equal(toBN(await policyBookMock.totalLiquidity()).toString(), investAmount.toString());
      assert.equal(toBN(await policyBookMock.liquidityFromLM(USER1)).toString(), investAmount.toString());
    });

    it('should create many group and investDAI with diiferent users', async () => {
      await liquidityMining.investDAI(0, investAmount, policyBookMock.address, {from: USER1});
      await liquidityMining.investDAI(0, investAmount.div(2), policyBookMock.address, {from: USER1});
      await liquidityMining.investDAI(0, investAmount.times(10), policyBookMock.address, {from: USER2});
      await liquidityMining.investDAI(0, investAmount.plus(1), policyBookMock.address, {from: USER2});
      await liquidityMining.investDAI(0, investAmount.minus(1), policyBookMock.address, {from: USER1});

      await checkLeaderboard(liquidityMining, [3, 4, 1, 5, 2]);

      await liquidityMining.investDAI(1, investAmount.times(10), policyBookMock.address, {from: USER2});
      await liquidityMining.investDAI(3, investAmount.div(2), policyBookMock.address, {from: USER1});
      await liquidityMining.investDAI(5, investAmount, policyBookMock.address, {from: USER2});

      await checkLeaderboard(liquidityMining, [1, 3, 5, 4, 2]);

      assert.equal(toBN(await liquidityMining.totalGroupsAmount(1)).toString(), 11000);
      assert.equal(toBN(await liquidityMining.totalGroupsAmount(2)).toString(), 500);
      assert.equal(toBN(await liquidityMining.totalGroupsAmount(3)).toString(), 10500);
      assert.equal(toBN(await liquidityMining.totalGroupsAmount(4)).toString(), 1001);
      assert.equal(toBN(await liquidityMining.totalGroupsAmount(5)).toString(), 1999);

      assert.equal(toBN(await policyBookMock.totalLiquidity()).toString(), 25000);
      assert.equal(toBN(await policyBookMock.liquidityFromLM(USER1)).toString(), 2999);
      assert.equal(toBN(await policyBookMock.liquidityFromLM(USER2)).toString(), 22001);
    });
  });

  describe('distributeAllNFT', async () => {
    const USER4 = accounts[4];

    it('should send zero nft if the user does not deserve a reward', async () => {
      await dai.transfer(USER1, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER1});

      await dai.transfer(USER2, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER2});

      for (let i = 0; i < 10; i++) {
        await liquidityMining.investDAI(0, 100, policyBookMock.address, {from: USER1});
      }

      await liquidityMining.investDAI(0, 50, policyBookMock.address, {from: USER2});

      await setCurrentTime(endLiquidityMiningTime.plus(10));
      await liquidityMining.distributeAllNFT({from: USER2});
      await checkNFTOnAccount(liquidityMiningNFT, USER2, 0, 0, 0, 0);
    });

    it('should send the necessary nft if the user is worthy', async () => {
      const users = [USER1, USER2, USER3, USER4];
      for (let i = 0; i < 4; i++) {
        await dai.transfer(users[i], daiAmount);
        await dai.approve(policyBookMock.address, daiAmount, {from: users[i]});
      }

      for (let i = 0; i < 5; i++) {
        await liquidityMining.investDAI(0, 1000, policyBookMock.address, {from: USER1});
      }

      await liquidityMining.investDAI(2, 2000, policyBookMock.address, {from: USER2});
      await liquidityMining.investDAI(3, 2000, policyBookMock.address, {from: USER2});
      await liquidityMining.investDAI(3, 3000, policyBookMock.address, {from: USER3});
      await liquidityMining.investDAI(3, 4000, policyBookMock.address, {from: USER4});
      await liquidityMining.investDAI(4, 4000, policyBookMock.address, {from: USER4});

      await setCurrentTime(endLiquidityMiningTime.plus(10));
      await liquidityMining.distributeAllNFT({from: USER1});
      await liquidityMining.distributeAllNFT({from: USER2});
      await liquidityMining.distributeAllNFT({from: USER4});

      await checkNFTOnAccount(liquidityMiningNFT, USER1, 2, 2, 1, 0);
      await checkNFTOnAccount(liquidityMiningNFT, USER2, 1, 1, 0, 0);
      await checkNFTOnAccount(liquidityMiningNFT, USER4, 2, 0, 0, 0);
    });

    it('should send 10 platinum and 5 silver nfts', async () => {
      await dai.transfer(USER1, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER1});

      await dai.transfer(USER2, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER2});

      for (let i = 0; i < 10; i++) {
        await liquidityMining.investDAI(0, 1000, policyBookMock.address, {from: USER1});
      }

      for (let i = 1; i <= 5; i++) {
        await liquidityMining.investDAI(i, 500, policyBookMock.address, {from: USER2});
      }

      await setCurrentTime(endLiquidityMiningTime.plus(10));
      await liquidityMining.distributeAllNFT({from: USER1});
      await liquidityMining.distributeAllNFT({from: USER2});

      await checkNFTOnAccount(liquidityMiningNFT, USER1, 10, 0, 0, 0);
      await checkNFTOnAccount(liquidityMiningNFT, USER2, 0, 5, 0, 0);
    });
  });

  describe('distributeNFT', async () => {
    const USER4 = accounts[4];
    const USER5 = accounts[5];

    beforeEach('setup', async () => {
      const users = [USER1, USER2, USER3, USER4, USER5];
      for (let i = 0; i < 5; i++) {
        await dai.transfer(users[i], daiAmount);
        await dai.approve(policyBookMock.address, daiAmount, {from: users[i]});
      }

      await liquidityMining.investDAI(0, 100, policyBookMock.address, {from: USER1});
    });

    it('should correct update accounts leaders', async () => {
      await liquidityMining.investDAI(1, 200, policyBookMock.address, {from: USER2});
      await liquidityMining.investDAI(1, 300, policyBookMock.address, {from: USER3});
      await liquidityMining.investDAI(1, 400, policyBookMock.address, {from: USER4});
      await liquidityMining.investDAI(1, 300, policyBookMock.address, {from: USER2});
      await liquidityMining.investDAI(1, 350, policyBookMock.address, {from: USER5});

      const expectedArr = [USER2, USER4, USER5, USER3, USER1];

      await checkGroupLeaders(liquidityMining, expectedArr, 1, 5);
    });

    it('should send correct nft', async () => {
      await liquidityMining.investDAI(1, 200, policyBookMock.address, {from: USER2});
      await liquidityMining.investDAI(1, 300, policyBookMock.address, {from: USER3});
      await liquidityMining.investDAI(1, 400, policyBookMock.address, {from: USER4});

      await setCurrentTime(endLiquidityMiningTime.plus(10));
      await liquidityMining.distributeNFT(1, {from: USER4});
      await liquidityMining.distributeNFT(1, {from: USER3});
      await liquidityMining.distributeNFT(1, {from: USER1});

      await checkNFTOnAccount(liquidityMiningNFT, USER4, 1, 0, 0, 0);
      await checkNFTOnAccount(liquidityMiningNFT, USER3, 0, 1, 0, 0);
      await checkNFTOnAccount(liquidityMiningNFT, USER1, 0, 0, 1, 0);
    });

    it('should emit event when nft sended', async () => {
      await setCurrentTime(endLiquidityMiningTime.plus(10));

      const result = await liquidityMining.distributeNFT(1, {from: USER1});

      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].event, 'NFTSent');
      assert.equal(result.logs[0].args._address, USER1);
      assert.equal(result.logs[0].args._nftIndex, 1);
    });

    it('should not send if the group is not in the lead', async () => {
      for (let i = 0; i < 10; i++) {
        await liquidityMining.investDAI(0, 100, policyBookMock.address, {from: USER1});
      }

      await setCurrentTime(endLiquidityMiningTime.plus(10));
      await liquidityMining.distributeNFT(11, {from: USER1});

      await checkNFTOnAccount(liquidityMiningNFT, USER1, 0, 0, 0, 0);
    });

    it('should not send if the person is not in the leader group', async () => {
      await setCurrentTime(endLiquidityMiningTime.plus(10));
      await liquidityMining.distributeNFT(1, {from: USER2});
      await checkNFTOnAccount(liquidityMiningNFT, USER2, 0, 0, 0, 0);
    });

    it('should get exception, 2 weeks has not expire', async () => {
      await truffleAssert.reverts(liquidityMining.distributeNFT(1, {from: USER1}),
        '2 weeks after liquidity mining time has not expired');
    });
  });

  describe('getRewardFromGroup', async () => {
    const amountToTransfer = oneBMI.times(1000000);

    beforeEach('setup', async () => {
      await dai.transfer(USER1, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER1});

      await dai.transfer(USER2, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER2});

      await bmiToken.transfer(liquidityMining.address, amountToTransfer);

      assert.equal(toBN(await bmiToken.balanceOf(liquidityMining.address)).toString(),
        amountToTransfer.toString());
    });

    it('should get zero if no reward is available', async () => {
      let amount = toBN(150);
      for (let i = 1; i <= 11; i++) {
        await liquidityMining.investDAI(0, amount, policyBookMock.address, {from: USER1});
        amount = amount.minus(5);
      }

      await setCurrentTime(endLiquidityMiningTime.plus(10));

      await liquidityMining.getRewardFromGroup(11, {from: USER1});
      assert.equal(toBN(await bmiToken.balanceOf(USER1)).toString(), 0);
    });

    it('should get 100% of tokens when user invest 100%', async () => {
      await liquidityMining.investDAI(0, 1000, policyBookMock.address, {from: USER1});
      await setCurrentTime(endLiquidityMiningTime.plus(10));

      await liquidityMining.getRewardFromGroup(1, {from: USER1});
      assert.equal(toBN(await bmiToken.balanceOf(USER1)).toString(), oneBMI.times(50000));
    });

    it('should correct get reward for different users', async () => {
      await dai.transfer(USER3, daiAmount);
      await dai.approve(policyBookMock.address, daiAmount, {from: USER3});

      await liquidityMining.investDAI(0, 100, policyBookMock.address, {from: USER1});
      await liquidityMining.investDAI(1, 400, policyBookMock.address, {from: USER2});
      await liquidityMining.investDAI(1, 500, policyBookMock.address, {from: USER3});
      await setCurrentTime(endLiquidityMiningTime.plus(10));

      await liquidityMining.getRewardFromGroup(1, {from: USER1});
      await liquidityMining.getRewardFromGroup(1, {from: USER2});
      await liquidityMining.getRewardFromGroup(1, {from: USER3});

      assert.equal(toBN(await bmiToken.balanceOf(USER1)).toString(), oneBMI.times(5000));
      assert.equal(toBN(await bmiToken.balanceOf(USER2)).toString(), oneBMI.times(20000));
      assert.equal(toBN(await bmiToken.balanceOf(USER3)).toString(), oneBMI.times(25000));
    });

    it('should get 100% of tokens 5 month reward on 2 place', async () => {
      await liquidityMining.investDAI(0, 1000, policyBookMock.address, {from: USER1});
      await liquidityMining.investDAI(0, 500, policyBookMock.address, {from: USER2});

      await setCurrentTime(endLiquidityMiningTime.plus(10).plus(oneMonth.times(4)));

      await liquidityMining.getRewardFromGroup(2, {from: USER2});
      assert.equal(toBN(await bmiToken.balanceOf(USER2)).toString(), oneBMI.times(50000));
    });

    it('should correct get reward multiple times', async () => {
      await liquidityMining.investDAI(0, 1000, policyBookMock.address, {from: USER1});
      await setCurrentTime(endLiquidityMiningTime.plus(10).plus(oneMonth));

      await liquidityMining.getRewardFromGroup(1, {from: USER1});
      assert.equal(toBN(await bmiToken.balanceOf(USER1)).toString(), oneBMI.times(100000));

      await setCurrentTime(endLiquidityMiningTime.plus(10).plus(oneMonth.times(7)));

      await liquidityMining.getRewardFromGroup(1, {from: USER1});
      assert.equal(toBN(await bmiToken.balanceOf(USER1)).toString(), oneBMI.times(250000));
    });

    it('should correct get reward multiple times with two users', async () => {
      const startTime = endLiquidityMiningTime.plus(10);
      const amount = toBN(1000);

      for (let i = 1; i <= 7; i++) {
        await liquidityMining.investDAI(0, amount, policyBookMock.address, {from: USER1});
      }

      await liquidityMining.investDAI(0, 100, policyBookMock.address, {from: USER1});
      await liquidityMining.investDAI(8, 100, policyBookMock.address, {from: USER2});

      const oneReward = oneBMI.times(2000);
      let totalTokens = oneReward;
      for (let i = 0; i < 4; i++) {
        await setCurrentTime(startTime.plus(oneMonth.times(i)));

        await liquidityMining.getRewardFromGroup(8, {from: USER1});
        await liquidityMining.getRewardFromGroup(8, {from: USER2});

        assert.equal(toBN(await bmiToken.balanceOf(USER1)).toString(), totalTokens.toString());
        assert.equal(toBN(await bmiToken.balanceOf(USER2)).toString(), totalTokens.toString());

        totalTokens = totalTokens.plus(oneReward);
      }
    });

    it('should get exception, 2 weeks has not expire', async () => {
      await truffleAssert.reverts(liquidityMining.getRewardFromGroup(3),
        '2 weeks after liquidity mining time has not expire');
    });
  });
});

function toBN(number) {
  return new BigNumber(number);
}

async function checkLeaderboard(liquidityMining, expectedLeaderboard) {
  const size = toBN(await liquidityMining.getLeaderboardSize());

  for (let i = 0; i < size; i++) {
    assert.equal(toBN(await liquidityMining.leaderboard(i)).toString(), toBN(expectedLeaderboard[i]).toString());
  }
}

async function checkGroupLeaders(liquidityMining, expectedLeaders, groupID, size) {
  for (let i = 0; i < size; i++) {
    assert.equal(toBN(await liquidityMining.groupsLeaders(groupID, i)).toString(),
      toBN(expectedLeaders[i]).toString());
  }
}

async function checkNFTOnAccount(liquidityMiningNFT, userAddress, platCount, goldCount, silverCount, bronzeCount) {
  assert.equal(toBN(await liquidityMiningNFT.balanceOf(userAddress, 1)).toString(), platCount);
  assert.equal(toBN(await liquidityMiningNFT.balanceOf(userAddress, 2)).toString(), goldCount);
  assert.equal(toBN(await liquidityMiningNFT.balanceOf(userAddress, 3)).toString(), silverCount);
  assert.equal(toBN(await liquidityMiningNFT.balanceOf(userAddress, 4)).toString(), bronzeCount);
}
