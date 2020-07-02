const truffleContract = require('truffle-contract');
const proxyArtifacts = require("@circles/safe-contracts/build/contracts/ProxyFactory.json");
const safeArtifacts = require("@circles/safe-contracts/build/contracts/GnosisSafe.json");

const GnosisSafe = truffleContract(safeArtifacts);
const ProxyFactory = truffleContract(proxyArtifacts);

GnosisSafe.setProvider(web3.currentProvider);
ProxyFactory.setProvider(web3.currentProvider);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(ProxyFactory, { from: accounts[0] });
  return deployer.deploy(GnosisSafe, { from: accounts[0] });
};
