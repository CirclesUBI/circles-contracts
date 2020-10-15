const Hub = artifacts.require('./Hub.sol');
const { convertToBaseUnit } = require('../test/helpers/math');

module.exports = async function (deployer) {
  await deployer.deploy(
    Hub,
    107,
    31556952,
    'CRC',
    'Circles',
    convertToBaseUnit(50),
    '92592592592592',
    '7776000',
  );
};
