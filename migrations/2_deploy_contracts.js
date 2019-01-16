var HubFactory = artifacts.require("./HubFactory.sol");

module.exports = function(deployer) {
  deployer.deploy(HubFactory);
};
