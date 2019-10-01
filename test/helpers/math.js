const { BigNumber, decimals } = require('./constants');

const decimalsMultiplier = (new BigNumber(10)).pow(decimals);
const convertToBaseUnit = number => (new BigNumber(number)).mul(decimalsMultiplier);
const bn = number => new BigNumber(number);

module.exports = {
  convertToBaseUnit,
  bn,
};
