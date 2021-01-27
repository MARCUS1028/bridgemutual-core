const ERC1155Mock = artifacts.require('./mock/ERC1155Mock');

const {assert} = require('chai');
const truffleAssert = require('truffle-assertions');

contract('ERC1155', async (accounts) => {
  let erc1155Mock;

  const MAIN = accounts[0];
  const HELP = accounts[1];

  describe('mint ERC721', async () => {
    before('setup', async () => {
      erc1155Mock = await ERC1155Mock.new();
    });

    const tokenID = 2;
    const firstReg = 1;

    it('should mint new ERC721 token', async () => {
      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID), 'ERC1155: owner query for nonexistent token');

      await erc1155Mock.mint(tokenID, 1);
      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 1);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID), MAIN);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 1);
    });

    it('shouldn\'t mint the same ERC721 token', async () => {
      await truffleAssert.reverts(erc1155Mock.mint(tokenID, 1), 'ERC1155: NFT token already minted');
    });

    it('shouldn\'t mint the ERC721 token on 1 registry', async () => {
      await erc1155Mock.mint(firstReg, 1);
      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 1);
      assert.equal(await erc1155Mock.balanceOf(MAIN), 1);
    });

    it('shouldn\'t mint ERC20 when ERC721 is minted', async () => {
      await truffleAssert.reverts(erc1155Mock.mint(tokenID, 100), 'ERC1155: NFT token already minted');
    });

    it('shouldn\'t revert when ERC721 is minted, but minting 0 tokens', async () => {
      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 1);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID), MAIN);

      await erc1155Mock.mint(tokenID, 0);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 1);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID), MAIN);
    });
  });

  describe('mint ERC20', async () => {
    before('setup', async () => {
      erc1155Mock = await ERC1155Mock.new();
    });

    const tokenID = 2;

    it('should mint new ERC20 tokens', async () => {
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 0);

      await erc1155Mock.mint(tokenID, 100);
      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 100);
    });

    it('shouldn\'t mint ERC721 token when ERC20 is minted', async () => {
      await erc1155Mock.mint(tokenID, 1);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 101);
    });

    it('shouldn\'t mint ERC721 token when many ERC20 are minted', async () => {
      await erc1155Mock.mint(tokenID, 100);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 201);
    });

    it('shouldn\'t mint any tokens', async () => {
      await erc1155Mock.mint(tokenID, 0);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 201);
    });
  });

  describe('mintBatch ERC721', async () => {
    before('setup', async () => {
      erc1155Mock = await ERC1155Mock.new();
    });

    const firstReg = 1;
    const tokenID1 = 2;
    const tokenID2 = 3;
    const tokenID3 = 4;

    it('should mint new ERC721 token', async () => {
      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID1), 'ERC1155: owner query for nonexistent token');
      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID2), 'ERC1155: owner query for nonexistent token');

      await erc1155Mock.mintBatch([tokenID1, tokenID2], [1, 1]);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 2);

      assert.equal(await erc1155Mock.ownerOfNFT(tokenID1), MAIN);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID2), MAIN);

      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 1);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 1);
    });

    it('shouldn\'t mint the same ERC721 tokens', async () => {
      await truffleAssert.reverts(erc1155Mock.mintBatch([tokenID1, tokenID2], [1, 1]),
        'ERC1155: NFT token already minted');
    });

    it('shouldn\'t mint the ERC721 tokens on 1 registry', async () => {
      await erc1155Mock.mintBatch([firstReg, tokenID3], [1, 1]);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 3);
      assert.equal(await erc1155Mock.balanceOf(MAIN), 1);
    });

    it('shouldn\'t mint ERC20 when ERC721 is minted', async () => {
      await truffleAssert.reverts(erc1155Mock.mintBatch([tokenID1, tokenID2], [100, 100]),
        'ERC1155: NFT token already minted');
    });

    it('shouldn\'t revert when ERC721 is minted, but minting 0 tokens', async () => {
      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 3);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID1), MAIN);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID2), MAIN);

      await erc1155Mock.mintBatch([tokenID1, tokenID2], [0, 0]);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 3);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID1), MAIN);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID2), MAIN);
    });
  });

  describe('mintBatch ERC20', async () => {
    before('setup', async () => {
      erc1155Mock = await ERC1155Mock.new();
    });

    const tokenID1 = 2;
    const tokenID2 = 3;

    it('should mint new ERC20 tokens', async () => {
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 0);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 0);

      await erc1155Mock.mintBatch([tokenID1, tokenID2], [100, 100]);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 100);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 100);
    });

    it('shouldn\'t mint ERC721 token when ERC20 is minted', async () => {
      await erc1155Mock.mintBatch([tokenID1, tokenID2], [1, 1]);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 101);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 101);
    });

    it('shouldn\'t mint ERC721 token when many ERC20 are minted', async () => {
      await erc1155Mock.mintBatch([tokenID1, tokenID2], [100, 100]);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 201);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 201);
    });

    it('shouldn\'t mint any tokens', async () => {
      await erc1155Mock.mintBatch([tokenID1, tokenID2], [0, 0]);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 201);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 201);
    });
  });

  describe('burn', async () => {
    before('setup', async () => {
      erc1155Mock = await ERC1155Mock.new();
    });

    const tokenID = 2;

    it('should mint and burn ERC721', async () => {
      await erc1155Mock.mint(tokenID, 1);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 1);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID), MAIN);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 1);

      await erc1155Mock.burn(tokenID, 1);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID), 'ERC1155: owner query for nonexistent token');
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 0);
    });

    it('should mint and burn ERC20', async () => {
      await erc1155Mock.mint(tokenID, 100);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID), 'ERC1155: owner query for nonexistent token');
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 100);

      await erc1155Mock.burn(tokenID, 100);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID), 'ERC1155: owner query for nonexistent token');
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 0);
    });

    it('should mint and not burn ERC721', async () => {
      await erc1155Mock.mint(tokenID, 1);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 1);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID), MAIN);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 1);

      await erc1155Mock.burn(tokenID, 0);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 1);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID), MAIN);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 1);
    });
  });

  describe('burnBatch', async () => {
    before('setup', async () => {
      erc1155Mock = await ERC1155Mock.new();
    });

    const tokenID1 = 2;
    const tokenID2 = 3;

    it('should mint and burn ERC721s', async () => {
      await erc1155Mock.mintBatch([tokenID1, tokenID2], [1, 1]);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 2);

      assert.equal(await erc1155Mock.ownerOfNFT(tokenID1), MAIN);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID2), MAIN);

      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 1);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 1);

      await erc1155Mock.burnBatch([tokenID1, tokenID2], [1, 1]);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);

      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID1), 'ERC1155: owner query for nonexistent token');
      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID2), 'ERC1155: owner query for nonexistent token');

      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 0);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 0);
    });

    it('should mint and burn ERC20s', async () => {
      await erc1155Mock.mintBatch([tokenID1, tokenID2], [100, 100]);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);

      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID1), 'ERC1155: owner query for nonexistent token');
      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID2), 'ERC1155: owner query for nonexistent token');

      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 100);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 100);

      await erc1155Mock.burnBatch([tokenID1, tokenID2], [100, 100]);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);

      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID1), 'ERC1155: owner query for nonexistent token');
      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID2), 'ERC1155: owner query for nonexistent token');

      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 0);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 0);
    });

    it('should mint and not burn ERC721s', async () => {
      await erc1155Mock.mint(tokenID1, 1);
      await erc1155Mock.mint(tokenID2, 1);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 2);

      assert.equal(await erc1155Mock.ownerOfNFT(tokenID1), MAIN);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 1);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID2), MAIN);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 1);

      await erc1155Mock.burnBatch([tokenID1, tokenID2], [0, 0]);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 2);

      assert.equal(await erc1155Mock.ownerOfNFT(tokenID1), MAIN);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 1);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID2), MAIN);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 1);
    });
  });

  describe('transferFrom', async () => {
    beforeEach('setup', async () => {
      erc1155Mock = await ERC1155Mock.new();
    });

    const tokenID = 2;

    it('should mint new ERC721 and transfer it', async () => {
      await erc1155Mock.mint(tokenID, 1);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 1);
      assert.equal(await erc1155Mock.balanceOfNFT(HELP), 0);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID), MAIN);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 1);
      assert.equal(await erc1155Mock.balanceOf(HELP, tokenID), 0);

      await erc1155Mock.safeTransferFrom(MAIN, HELP, tokenID, 1, []);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      assert.equal(await erc1155Mock.balanceOfNFT(HELP), 1);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID), HELP);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 0);
      assert.equal(await erc1155Mock.balanceOf(HELP, tokenID), 1);
    });

    it('should mint new ERC20 and transfer half of it', async () => {
      await erc1155Mock.mint(tokenID, 100);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      assert.equal(await erc1155Mock.balanceOfNFT(HELP), 0);
      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID), 'ERC1155: owner query for nonexistent token');
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 100);
      assert.equal(await erc1155Mock.balanceOf(HELP, tokenID), 0);

      await erc1155Mock.safeTransferFrom(MAIN, HELP, tokenID, 50, []);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      assert.equal(await erc1155Mock.balanceOfNFT(HELP), 0);
      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID), 'ERC1155: owner query for nonexistent token');
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID), 50);
      assert.equal(await erc1155Mock.balanceOf(HELP, tokenID), 50);
    });
  });

  describe('batchTransferFrom', async () => {
    beforeEach('setup', async () => {
      erc1155Mock = await ERC1155Mock.new();
    });

    const tokenID1 = 2;
    const tokenID2 = 3;

    it('should mint new ERC721s and transfer them', async () => {
      await erc1155Mock.mintBatch([tokenID1, tokenID2], [1, 1]);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 2);
      assert.equal(await erc1155Mock.balanceOfNFT(HELP), 0);

      assert.equal(await erc1155Mock.ownerOfNFT(tokenID1), MAIN);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID2), MAIN);

      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 1);
      assert.equal(await erc1155Mock.balanceOf(HELP, tokenID1), 0);

      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 1);
      assert.equal(await erc1155Mock.balanceOf(HELP, tokenID2), 0);

      await erc1155Mock.safeBatchTransferFrom(MAIN, HELP, [tokenID1, tokenID2], [1, 1], []);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      assert.equal(await erc1155Mock.balanceOfNFT(HELP), 2);

      assert.equal(await erc1155Mock.ownerOfNFT(tokenID1), HELP);
      assert.equal(await erc1155Mock.ownerOfNFT(tokenID2), HELP);

      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 0);
      assert.equal(await erc1155Mock.balanceOf(HELP, tokenID1), 1);

      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 0);
      assert.equal(await erc1155Mock.balanceOf(HELP, tokenID2), 1);
    });

    it('should mint new ERC20s and transfer half of them', async () => {
      await erc1155Mock.mintBatch([tokenID1, tokenID2], [100, 100]);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      assert.equal(await erc1155Mock.balanceOfNFT(HELP), 0);

      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 100);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 100);

      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID1), 'ERC1155: owner query for nonexistent token');
      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID2), 'ERC1155: owner query for nonexistent token');

      await erc1155Mock.safeBatchTransferFrom(MAIN, HELP, [tokenID1, tokenID2], [50, 50], []);

      assert.equal(await erc1155Mock.balanceOfNFT(MAIN), 0);
      assert.equal(await erc1155Mock.balanceOfNFT(HELP), 0);

      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID1), 'ERC1155: owner query for nonexistent token');
      await truffleAssert.reverts(erc1155Mock.ownerOfNFT(tokenID2), 'ERC1155: owner query for nonexistent token');

      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID1), 50);
      assert.equal(await erc1155Mock.balanceOf(HELP, tokenID1), 50);
      assert.equal(await erc1155Mock.balanceOf(MAIN, tokenID2), 50);
      assert.equal(await erc1155Mock.balanceOf(HELP, tokenID2), 50);
    });
  });
});
