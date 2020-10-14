const Hub = artifacts.require('./Hub.sol');
const { convertToBaseUnit } = require('../test/helpers/math');

module.exports = async function (deployer) {
  await deployer.deploy(
    Hub,
    107,
    31556952,
    'CRC',
    'Circles',
    convertToBaseUnit(100),
    '23148148148148',
    '31540000000',
  );
};
