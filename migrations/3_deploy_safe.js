const truffleContract = require('@truffle/contract');
const proxyArtifacts = require('@circles/safe-contracts/build/contracts/ProxyFactory.json');
const safeArtifacts = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const multiSendArtifacts = require('@circles/safe-contracts/build/contracts/MultiSend.json');
const masterCopyArtifact = require('@circles/safe-contracts/build/contracts/MasterCopy.json');

const GnosisSafe = truffleContract(safeArtifacts);
const ProxyFactory = truffleContract(proxyArtifacts)
const MultiSend = truffleContract(multiSendArtifacts)
const MasterCopy = truffleContract(masterCopyArtifact)
GnosisSafe.setProvider(web3.currentProvider);
ProxyFactory.setProvider(web3.currentProvider);
MultiSend.setProvider(web3.currentProvider);
MasterCopy.setProvider(web3.currentProvider);

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(MultiSend, { from: accounts[0] })
  await deployer.deploy(MasterCopy, { from: accounts[0] })
  await deployer.deploy(GnosisSafe, { from: accounts[0] })
  return deployer.deploy(ProxyFactory, { from: accounts[0] });
};
