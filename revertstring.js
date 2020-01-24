const truffleContract = require('truffle-contract');
const hubArtifacts = require('./build/contracts/Hub.json');
const safeArtifacts = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const proxyArtifacts = require('@circles/safe-contracts/build/contracts/ProxyFactory.json');
const { estimateTxGas } = require('./estimateGas');
const HDWalletProvider = require('truffle-hdwallet-provider');

const Web3 = require('web3');

//const web3 = new Web3(new Web3.providers.HttpProvider('https://dai.poa.network'));

//const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const provider = new HDWalletProvider(
  "brother mask over deny kangaroo buddy stick settle pulse involve ramp shift",
  'https://kovan.infura.io/v3/0a9d453d25754d52973ee1a69ea37937')

const web3 = new Web3(provider);

const Hub = truffleContract(hubArtifacts);
const ProxyFactory = truffleContract(proxyArtifacts);
const Safe = truffleContract(safeArtifacts);

const owner = '0x10F23C21660463304D5Eda6B07bfb42F41207B86'
const otherAddress = '0xaa2dbA2d776893d2c99a3261f45eEB6E1b38EEe1'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

Hub.setProvider(web3.currentProvider);
ProxyFactory.setProvider(web3.currentProvider);
Safe.setProvider(web3.currentProvider);

const test = async () => {
  // const hub = await Hub.at("0x94b4D1e2b901e478d652f3f8C990C152c7606241")
  // const proxyFactory = await ProxyFactory.at('0x233131b12a6D36c8c1A28995C47A27010964157A')
  // const safe = await Safe.at('0x11451dFF80dD7d48186D6a3C6493b978EB8dBAc9')

  const hub = await Hub.at("0x7fCF7AC779fAe80678925CE42b76553A1214fb84")
  const proxyFactory = await ProxyFactory.at('0x36C753782FC2a1b7058DFEc021BaE8f749042f73')
  const safe = await Safe.at('0x16c08FD4d098a6d72Da7196AD129D8B04425Df91')

  // const data = await hub.contract.methods
  //   .signup("test")
  //   .encodeABI();

  // console.log(data)
  // //const data = "0x9951d62f000000000000000000000000890cebfbbfa2bbd5d41129024cf841309f7c5f460000000000000000000000000000000000000000000000000000000000000032"
  // const gas = await estimateTxGas(safe, hub.address, 0, data, 1, web3.utils.toBN);
  const account = await web3.eth.getAccounts()
  console.log(account)

  const tx = await hub.signup("test", { from: account[0] })

  console.log(tx)
}

test()