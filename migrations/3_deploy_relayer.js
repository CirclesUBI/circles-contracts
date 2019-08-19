const TxRelay = artifacts.require("./TxRelay.sol");
const Hub = artifacts.require("./Hub.sol");
const HubFactory = artifacts.require("./HubFactory.sol");

const instantiateHub = async (hubFactory) => {
  const events = await hubFactory.getPastEvents('Spawn', { fromBlock: 0, toBlock: 'latest' });
  const hubContract = new web3.eth.Contract(
    Hub.abi,
    events[0].returnValues.newHub
  );
  return hubContract
};

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(TxRelay);
  const relayer = await TxRelay.deployed();
  const hubFactory = await HubFactory.deployed();
  const hub = await instantiateHub(hubFactory);
  console.log('Hub address: ', hub.options.address)
  console.log('Relayer address: ', relayer.address)
  return hub.methods.updateRelayer(relayer.address, true).send({ from: accounts[0] });
};
