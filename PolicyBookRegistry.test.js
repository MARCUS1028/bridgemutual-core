/*global contract*/
const BN = require("bn.js");
const { expectRevert } = require("@openzeppelin/test-helpers");

require("chai").use(require("chai-as-promised")).use(require("chai-bn")(BN)).should();

const PolicyBookRegistry = artifacts.require("PolicyBookRegistry");

contract.skip("PolicyBookRegistry", async ([defaultAddress, ...addresses]) => {
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const deploy = async () => {
    const registry = await PolicyBookRegistry.new();
    await registry.setPolicyFabricAddress(defaultAddress);
    return registry;
  };

  const getAddedEvent = (tx) => tx.logs.find((x) => x.event == "Added").args;

  describe("# PolicyBookRegistry set fabric address", async () => {
    it("should not allow not owner to set", async () => {
      const registry = await deploy();

      await expectRevert(
        registry.setPolicyFabricAddress(addresses[0], { from: addresses[1] }),
        "Ownable: caller is not the owner"
      );
    });

    it("should actually set address", async () => {
      const registry = await deploy();
      await registry.setPolicyFabricAddress(addresses[0]);
      (await registry.policyFabricAddress()).should.be.equal(addresses[0]);
    });
  });

  describe("# PolicyBookRegistry add", async () => {
    it("should not allow not fabric to add", async () => {
      const registry = await deploy();

      await expectRevert(
        registry.add(addresses[0], addresses[1], { from: addresses[1] }),
        "Caller is not a policyFabric contract"
      );
    });

    it("should not allow to add dublicate by the same address", async () => {
      const registry = await deploy();

      await registry.add(addresses[0], addresses[1]);
      await expectRevert(registry.add(addresses[0], addresses[2]), "PolicyBook for the contract is already created");
    });

    it("should emit added event", async () => {
      const registry = await deploy();

      const tx = await registry.add(addresses[0], addresses[1]);
      const event = getAddedEvent(tx);
      event.insured.should.be.equal(addresses[0]);
      event.at.should.be.equal(addresses[1]);
    });

    it("should increase count of books", async () => {
      const registry = await deploy();

      (await registry.count()).should.be.bignumber.equal("0");
      await registry.add(addresses[0], addresses[1]);
      (await registry.count()).should.be.bignumber.equal("1");
    });

    it("should save policy book by address", async () => {
      const registry = await deploy();

      (await registry.policyBookFor(addresses[0])).should.be.equal(zeroAddress);
      await registry.add(addresses[0], addresses[1]);
      (await registry.policyBookFor(addresses[0])).should.be.equal(addresses[1]);
    });

    it("should save policy book", async () => {
      const registry = await deploy();
      (await registry.list(0, 10))[1].should.be.deep.equal([]);
      await registry.add(addresses[0], addresses[1]);
      (await registry.list(0, 10))[1].should.be.deep.equal([addresses[1]]);
    });
  });

  describe("# PolicyBookRegistry get books", async () => {
    const deployWithThreeBooks = async () => {
      const registry = await deploy();

      const bookAddresses = addresses.slice(0, 3);

      await registry.add(addresses[3], bookAddresses[0]);
      await registry.add(addresses[4], bookAddresses[1]);
      await registry.add(addresses[5], bookAddresses[2]);

      return [registry, bookAddresses];
    };

    it("should return valid if inside range", async () => {
      const [registry, bookAddresses] = await deployWithThreeBooks();

      const result = await registry.list(0, 3);
      result[0].should.be.bignumber.equal("3");
      result[1].should.be.deep.equal(bookAddresses);
    });

    it("should return valid longer than range", async () => {
      const [registry, bookAddresses] = await deployWithThreeBooks();

      const result = await registry.list(1, 3);
      result[0].should.be.bignumber.equal("2");
      result[1].should.be.deep.equal(bookAddresses.slice(1, 3));
    });

    it("should return valid outside of range", async () => {
      const [registry] = await deployWithThreeBooks();

      const result = await registry.list(3, 10);
      result[1].should.be.deep.equal([]);
    });
  });
});
