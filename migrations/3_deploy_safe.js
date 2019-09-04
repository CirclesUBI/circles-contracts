const truffleContract = require('truffle-contract');
const proxyArtifacts = require('@gnosis.pm/safe-contracts/build/contracts/ProxyFactory.json');
const safeArtifacts = require("@gnosis.pm/safe-contracts/build/contracts/GnosisSafe.json");

const ProxyFactory = truffleContract(proxyArtifacts);
const GnosisSafe = truffleContract(safeArtifacts);

ProxyFactory.setProvider(web3.currentProvider);
GnosisSafe.setProvider(web3.currentProvider);

const notOwnedAddress = "0x0000000000000000000000000000000000000002";

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(ProxyFactory, { from: accounts[0] });
  return deployer.deploy(GnosisSafe, { from: accounts[0] }).then((safe) => {
    safe.setup([notOwnedAddress], 1, 0, 0, 0, 0, 0, 0)
    return safe
  });
};
