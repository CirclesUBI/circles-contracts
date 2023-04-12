const fs = require('fs');

const truffleContract = require('@truffle/contract');
const proxyArtifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json');
const safeArtifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/GnosisSafe.sol/GnosisSafe.json');
const multiSendArtifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/libraries/MultiSend.sol/MultiSend.json');
const MultiSendCallOnlyArtifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json');
const DefaultCallbackHandlerArtifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/handler/DefaultCallbackHandler.sol/DefaultCallbackHandler.json');
const safeL2Artifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/GnosisSafeL2.sol/GnosisSafeL2.json');

const GnosisSafe = truffleContract(safeArtifacts);
const ProxyFactory = truffleContract(proxyArtifacts);
const MultiSend = truffleContract(multiSendArtifacts);
const MultiSendCallOnly = truffleContract(MultiSendCallOnlyArtifacts);
const DefaultCallbackHandler = truffleContract(DefaultCallbackHandlerArtifacts);
const GnosisSafeL2 = truffleContract(safeL2Artifacts);

GnosisSafe.setProvider(web3.currentProvider);
ProxyFactory.setProvider(web3.currentProvider);
MultiSend.setProvider(web3.currentProvider);
MultiSendCallOnly.setProvider(web3.currentProvider);
DefaultCallbackHandler.setProvider(web3.currentProvider);
GnosisSafeL2.setProvider(web3.currentProvider);

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(MultiSend, { from: accounts[0] }).then((result) => {
    fs.appendFile('addresses', `${result.address} \n`, (err) => {
      if (err) throw err;
    });
  });
  await deployer.deploy(GnosisSafe, { from: accounts[0] }).then((result) => {
    fs.appendFile('addresses', `${result.address} \n`, (err) => {
      if (err) throw err;
    });
  });
  await deployer.deploy(MultiSendCallOnly, { from: accounts[0] }).then((result) => {
    fs.appendFile('addresses', `${result.address} \n`, (err) => {
      if (err) throw err;
    });
  });
  await deployer.deploy(ProxyFactory, { from: accounts[0] }).then((result) => {
    fs.appendFile('addresses', `${result.address} \n`, (err) => {
      if (err) throw err;
    });
  });
  await deployer.deploy(DefaultCallbackHandler, { from: accounts[0] }).then((result) => {
    fs.appendFile('addresses', `${result.address} \n`, (err) => {
      if (err) throw err;
    });
  });
  return deployer.deploy(GnosisSafeL2, { from: accounts[0] }).then((result) => {
    fs.appendFile('addresses', `${result.address} \n`, (err) => {
      if (err) throw err;
    });
  });
};
