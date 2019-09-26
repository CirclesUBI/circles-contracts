const Hub = artifacts.require("./Hub.sol");
const { convert } = require('../test/helpers/math');


module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(Hub, accounts[0], 1736111111111111, 0, 'CRC', convert(100));
};
