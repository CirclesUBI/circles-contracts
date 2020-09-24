require('dotenv').config();
const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
  compilers: {
    solc: {
      version: '0.7.1', // ex:  "0.4.20". (Default: Truffle's installed solc)
      settings: {
        optimizer: {
          enabled: true,
          runs: 50, // Optimize for how many times you intend to run the code
        },
      },
    },
  },
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
    },
    coverage: {
      host: 'localhost',
      network_id: '*',
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
    ganache: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
    },
    kovan: {
      provider: function () {
        return new HDWalletProvider(
          process.env.MNEMONIC,
          `https://kovan.infura.io/v3/${process.env.PROJECT_ID}`)
      },
      port: 8545,
      network_id: 42,
      gas: 10000000,
      gasPrice: 12500000000,
    },
    xdai: {
      provider: function() {
        return new HDWalletProvider(
        process.env.MNEMONIC,
        "https://dai.poa.network")
      },
      network_id: 100,
      gas: 12500000,
      gasPrice: 1000000000,
    },
  },
};
