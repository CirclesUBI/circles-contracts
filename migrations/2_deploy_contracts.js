var PersonFactory = artifacts.require("./PersonFactory.sol");

module.exports = function(deployer) {
  deployer.deploy(PersonFactory);
};
