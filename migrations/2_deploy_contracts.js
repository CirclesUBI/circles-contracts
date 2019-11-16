const Hub = artifacts.require("./Hub.sol");
const { convertToBaseUnit } = require('../test/helpers/math');

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(Hub, accounts[0], 275, 100, 7885000000, 'CRC', convertToBaseUnit(100));
};
