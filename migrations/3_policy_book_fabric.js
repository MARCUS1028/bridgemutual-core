const PolicyBookFabric = artifacts.require("PolicyBookFabric");

module.exports = function (deployer) {
  deployer.deploy(PolicyBookFabric);
};
