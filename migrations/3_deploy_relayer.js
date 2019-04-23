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

module.exports = async function(deployer) {
  await deployer.deploy(TxRelay);
  const relayer = await TxRelay.deployed();
  const hubFactory = await HubFactory.deployed();
  const hub = await instantiateHub(hubFactory);
  return hub.methods.toggleRelayer(relayer.address).call();
};
