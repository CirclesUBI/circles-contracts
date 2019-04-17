const HubFactory = artifacts.require("./HubFactory.sol");

module.exports = async function(deployer) {
  await deployer.deploy(HubFactory);
  const hubFactory = await HubFactory.deployed()

  const issuance = 1736111111111111;
  const demmurage = 0;
  const symbol = 'CRC';
  const initalPayout = 100;

  return hubFactory.spawn(issuance, demmurage, symbol, initalPayout);
};
