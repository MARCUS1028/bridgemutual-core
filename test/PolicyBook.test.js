/*global contract*/
const BN = require("bn.js");
const { expectRevert } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

require("chai").use(require("chai-as-promised")).use(require("chai-bn")(BN)).should();

const PolicyBook = artifacts.require("PolicyBook");

contract("PolicyBook", async (addresses) => {
  let deployed;

  beforeEach("setup", async () => {
    deployed = await PolicyBook.new(addresses[1], 0);
  });

  describe.only("getQuote()", async () => {
    let days;
    let myMoney;
    let total;
    let bought;

    it("calculating annual cost where UR = 51% < RISKY, (doc example 1)", async () => {
      days = 365;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await deployed.setPoolDaiTotal(total);
      await deployed.setPoolDaiBought(bought);

      const calculatedPrice = (await deployed.getQuote(days, myMoney)).toNumber();

      assert.equal(calculatedPrice, 21857, "UR < RISKY case is incorrect");
    });

    it("calculating annual cost where UR = 90% > RISKY, (doc example 2)", async () => {
      days = 365;
      myMoney = 4000000; // 4mil
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await deployed.setPoolDaiTotal(total);
      await deployed.setPoolDaiBought(bought);

      const calculatedPrice = (await deployed.getQuote(days, myMoney)).toNumber();

      assert.equal(calculatedPrice, 4399999, "UR > RISKY case is incorrect");
    });

    it("calculating annual cost where UR = 6% < RISKY, (doc example 3)", async () => {
      days = 365;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 500000; // 500k

      await deployed.setPoolDaiTotal(total);
      await deployed.setPoolDaiBought(bought);

      const calculatedPrice = (await deployed.getQuote(days, myMoney)).toNumber();

      assert.equal(calculatedPrice, 5000, "UR < RISKY case is incorrect");
    });

    it("calculating 100 days cost where UR = 51% < RISKY", async () => {
      days = 100;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await deployed.setPoolDaiTotal(total);
      await deployed.setPoolDaiBought(bought);

      const calculatedPrice = (await deployed.getQuote(days, myMoney)).toNumber();

      assert.equal(calculatedPrice, parseInt(21857 * (100 / 365)), "UR < RISKY case is incorrect");
    });

    it("calculating 1 day cost where UR = 51% < RISKY", async () => {
      days = 1;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await deployed.setPoolDaiTotal(total);
      await deployed.setPoolDaiBought(bought);

      const calculatedPrice = (await deployed.getQuote(days, myMoney)).toNumber();

      assert.equal(calculatedPrice, parseInt(21857 * (1 / 365)), "UR < RISKY case is incorrect");
    });

    it("calculating 999 days cost where UR = 51% < RISKY", async () => {
      days = 999;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await deployed.setPoolDaiTotal(total);
      await deployed.setPoolDaiBought(bought);

      const calculatedPrice = (await deployed.getQuote(days, myMoney)).toNumber();

      assert.equal(calculatedPrice, parseInt(21857 * (999 / 365)), "UR < RISKY case is incorrect");
    });

    it("calculating 0 days cost", async () => {
      days = 0;
      myMoney = 100000; // 100k
      total = 10000000; // 10mil
      bought = 5000000; // 5mil

      await deployed.setPoolDaiTotal(total);
      await deployed.setPoolDaiBought(bought);

      const calculatedPrice = (await deployed.getQuote(days, myMoney)).toNumber();

      assert.equal(calculatedPrice, 0, "No matter what it should equal to 0");
    });

    it("calculating annual days cost, forcing minimal persentage treshold", async () => {
      days = 365;
      myMoney = 100; // 100
      total = 10000000; // 10mil
      bought = 0; // 0

      await deployed.setPoolDaiTotal(total);
      await deployed.setPoolDaiBought(bought);

      const calculatedPrice = (await deployed.getQuote(days, myMoney)).toNumber();

      assert.equal(calculatedPrice, 5, "Less than minimal");
    });

    it("calculating 10 years cost where UR = 51% < RISKY + really big money", async () => {
      days = 365 * 10;
      myMoney = 1000000000000; // 1tril
      total = 100000000000000; // 100tril
      bought = 50000000000000; // 50tril

      await deployed.setPoolDaiTotal(total);
      await deployed.setPoolDaiBought(bought);

      const calculatedPrice = (await deployed.getQuote(days, myMoney)).toNumber();

      assert.equal(calculatedPrice, 2185714285710, "UR < RISKY case is incorrect");
    });

    it("calculating 100 years cost where UR = 51% < RISKY + really small money", async () => {
      days = 365 * 100;
      myMoney = 1; // 1
      total = 100; // 100
      bought = 50; // 50

      await deployed.setPoolDaiTotal(total);
      await deployed.setPoolDaiBought(bought);

      const calculatedPrice = (await deployed.getQuote(days, myMoney)).toNumber();

      assert.equal(calculatedPrice, 21, "UR < RISKY case is incorrect");
    });

    it("edge case: calculating annual cost where UR = 100% > RISKY", async () => {
      days = 365;
      myMoney = 500000; // 500k
      total = 1000000; // 1mil
      bought = 500000; // 500k

      await deployed.setPoolDaiTotal(total);
      await deployed.setPoolDaiBought(bought);

      const calculatedPrice = (await deployed.getQuote(days, myMoney)).toNumber();

      assert.equal(calculatedPrice, 750000, "UR < RISKY case is incorrect");
    });

    it("require more tokens than there exists (should revert)", async () => {
      days = 365;
      myMoney = 600000; // 600k
      total = 1000000; // 1mil
      bought = 500000; // 500k

      await deployed.setPoolDaiTotal(total);
      await deployed.setPoolDaiBought(bought);

      expectRevert(deployed.getQuote(days, myMoney), "Requiring more than should be able to");
    });
  });
});
