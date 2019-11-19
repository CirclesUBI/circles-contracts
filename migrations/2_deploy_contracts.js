const Hub = artifacts.require("./Hub.sol");
const { convertToBaseUnit } = require('../test/helpers/math');

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(Hub, accounts[0], 1019178, 1000000, 86400, 'CRC', convertToBaseUnit(100));
};
