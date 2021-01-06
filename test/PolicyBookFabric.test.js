/*global contract*/
const BN = require("bn.js");
const { expectRevert } = require("@openzeppelin/test-helpers");

require("chai").use(require("chai-as-promised")).use(require("chai-bn")(BN)).should();

const PolicyBookFabric = artifacts.require("PolicyBookFabric");
const PolicyBook = artifacts.require("PolicyBook");

contract("PolicyBookFabric", async (addresses) => {
  const deploy = async () => {
    return await PolicyBookFabric.new();
  };

  const deployWithThreeBooks = async () => {
    const fabric = await PolicyBookFabric.new();

    const bookAddresses = [];

    await fabric.create(addresses[1], 0);
    bookAddresses.push(await fabric.policyBookFor(addresses[1]));
    await fabric.create(addresses[2], 1);
    bookAddresses.push(await fabric.policyBookFor(addresses[2]));
    await fabric.create(addresses[3], 2);
    bookAddresses.push(await fabric.policyBookFor(addresses[3]));

    return [fabric, bookAddresses];
  };

  const getCreatedSetEvent = (tx) => tx.logs.find((x) => x.event == "Created").args;

  describe("# PolicyBookFabric create", async () => {
    it("should instantiate contract at saved address", async () => {
      const fabric = await deploy();

      await fabric.create(addresses[1], 1);
      const address = await fabric.policyBookFor(addresses[1]);
      const book = await PolicyBook.at(address);
      (await book.contractAddress()).should.be.equal(addresses[1]);
      (await book.contractType()).should.be.bignumber.equal("1");
    });

    it("should emit created event", async () => {
      const fabric = await deploy();

      const tx = await fabric.create(addresses[1], 1);
      const address = await fabric.policyBookFor(addresses[1]);
      const event = getCreatedSetEvent(tx);
      event.insured.should.be.equal(addresses[1]);
      event.contractType.should.be.bignumber.equal("1");
      event.at.should.be.equal(address);
    });

    it("should not allow to create dublicate by the same address", async () => {
      const fabric = await deploy();

      await fabric.create(addresses[1], 1);
      await expectRevert(fabric.create(addresses[1], 1), "Address already used");
    });

    it("should increase count of books", async () => {
      const fabric = await deploy();

      (await fabric.policyBooksCount()).should.be.bignumber.equal("0");
      await fabric.create(addresses[1], 1);
      (await fabric.policyBooksCount()).should.be.bignumber.equal("1");
    });
  });

  describe("# PolicyBookFabric get books", async () => {
    it("should return valid if inside range", async () => {
      const [fabric, bookAddresses] = await deployWithThreeBooks();

      const result = await fabric.policyBooks(0, 3);
      result[0].should.be.bignumber.equal("3");
      result[1].should.be.deep.equal(bookAddresses);
    });

    it("should return valid longer than range", async () => {
      const [fabric, bookAddresses] = await deployWithThreeBooks();

      const result = await fabric.policyBooks(1, 3);
      result[0].should.be.bignumber.equal("2");
      result[1].should.be.deep.equal(bookAddresses.slice(1, 3));
    });

    it("should return valid outside of range", async () => {
      const [fabric] = await deployWithThreeBooks();

      const result = await fabric.policyBooks(3, 10);
      result[1].should.be.deep.equal([]);
    });
  });
});
