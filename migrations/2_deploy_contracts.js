var CirclesPersonFactory = artifacts.require("./CirclesPersonFactory.sol");

module.exports = function(deployer) {
  deployer.deploy(CirclesPersonFactory);
};
