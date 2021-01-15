/*global contract*/
const BMIToken = artifacts.require("BMIToken.sol");
const BN = require("bn.js");

require("chai").use(require("chai-as-promised")).use(require("chai-bn")(BN)).should();

contract("BMIToken", async ([, otherAddress]) => {
  const deployToken = async () => await BMIToken.new(otherAddress);

  describe("# BMIToken contract details", async () => {
    it("should deploy with correct name", async () => {
      const token = await deployToken();

      (await token.name()).should.be.equal("BridgeMutual Insurance");
    });

    it("should deploy with correct symbol", async () => {
      const token = await deployToken();

      (await token.symbol()).should.be.equal("BMI");
    });

    it("should deploy with correct decimals", async () => {
      const token = await deployToken();

      (await token.decimals()).should.be.bignumber.equal("18");
    });
  });

  describe("# BMIToken initial distribution", async () => {
    it("should deploy with expected total supply", async () => {
      const token = await deployToken();

      const expected = "160" + "0".repeat(6) + "0".repeat(18);
      (await token.totalSupply()).should.be.bignumber.equal(expected);
    });

    it("should deploy giving expected amount to vesting", async () => {
      const token = await deployToken();

      const expected = "160" + "0".repeat(6) + "0".repeat(18);
      (await token.balanceOf(otherAddress)).should.be.bignumber.equal(expected);
    });
  });
});
