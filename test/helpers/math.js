const { BigNumber, decimals } = require('./constants');

const decimalsMultiplier = (new BigNumber(10)).pow(decimals);
const convertToBaseUnit = number => (new BigNumber(number)).mul(decimalsMultiplier);
const bn = number => new BigNumber(number);

const ubiPayout = (init, inf, div, periods) => {
  // const q = inf.pow(bn(periods.add(new BigNumber(1))));
  // const d = div.pow(bn(periods.add(new BigNumber(1))));
  const q = inf.pow(bn(periods));
  const d = div.pow(bn(periods));
  return ((div.mul(init).mul(q.sub(d))).div(inf.sub(div))).div(d);
}

module.exports = {
  convertToBaseUnit,
  bn,
  ubiPayout,
};
