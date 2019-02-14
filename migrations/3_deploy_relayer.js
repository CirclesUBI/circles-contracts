const TxRelay = artifacts.require("./TxRelay.sol");

module.exports = async function(deployer) {
  await deployer.deploy(TxRelay);
  return TxRelay.deployed();
};
