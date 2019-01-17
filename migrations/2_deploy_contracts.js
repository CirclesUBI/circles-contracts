const HubFactory = artifacts.require("./HubFactory.sol");

module.exports = async function(deployer) {
  await deployer.deploy(HubFactory);
  const hubFactory = await HubFactory.deployed()
  return hubFactory.spawn(1736111111111111, 0, 18, 'CRC', 3600);
};
