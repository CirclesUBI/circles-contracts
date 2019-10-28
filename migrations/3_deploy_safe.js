const truffleContract = require('truffle-contract');
const ProxyFactory = artifacts.require('ProxyFactory.sol');
const safeArtifacts = require("@gnosis.pm/safe-contracts/build/contracts/GnosisSafe.json");

const GnosisSafe = truffleContract(safeArtifacts);

GnosisSafe.setProvider(web3.currentProvider);

const notOwnedAddress = "0x0000000000000000000000000000000000000002";
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(ProxyFactory, { from: accounts[0] });
  return deployer.deploy(GnosisSafe, { from: accounts[0] }).then(async (safe) => {
    await safe.setup([notOwnedAddress], 1, ZERO_ADDRESS, '0x', ZERO_ADDRESS, 0, ZERO_ADDRESS, { from: accounts[0] })
    return safe
  });
};
