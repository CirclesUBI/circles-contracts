const truffleContract = require('@truffle/contract');
const proxyArtifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json');
const safeArtifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/GnosisSafe.sol/GnosisSafe.json');
const multiSendArtifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/libraries/MultiSend.sol/MultiSend.json');
const MultiSendCallOnlyArtifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json');

const GnosisSafe = truffleContract(safeArtifacts);
const ProxyFactory = truffleContract(proxyArtifacts);
const MultiSend = truffleContract(multiSendArtifacts);
const MultiSendCallOnly = truffleContract(MultiSendCallOnlyArtifacts);

GnosisSafe.setProvider(web3.currentProvider);
ProxyFactory.setProvider(web3.currentProvider);
MultiSend.setProvider(web3.currentProvider);
MultiSendCallOnly.setProvider(web3.currentProvider);

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(MultiSend, { from: accounts[0] });
  await deployer.deploy(GnosisSafe, { from: accounts[0] });
  await deployer.deploy(MultiSendCallOnly, { from: accounts[0] });
  return deployer.deploy(ProxyFactory, { from: accounts[0] });
};
