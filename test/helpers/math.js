const { BigNumber, decimals } = require('./constants');

const decimalsMultiplier = (new BigNumber(10)).pow(decimals);
const convertToBaseUnit = number => (new BigNumber(number)).mul(decimalsMultiplier);
const bn = number => new BigNumber(number);

// const ubiPayout = (init, inf, div, periods) => {
//   const q = inf.pow(bn(periods));
//   const d = div.pow(bn(periods));
//   return ((div.mul(init).mul(q.sub(d))).div(inf.sub(div))).div(d);
// };

const inflate = (init, inf, div, periods) => {
  const q = inf.pow(bn(periods));
  const d = div.pow(bn(periods));
  return (init.mul(q)).div(d);
};

const ubiPayout = (rate, clock, time, offset, period) => {
  let payout = bn(0);
  while (clock.add(offset).lte(bn(time))) {
    payout = payout.add(offset.mul(rate));
    clock = clock.add(offset);
    offset = period;
    rate = inflate(rate, 1);
  }
  payout = payout.add(bn(time).sub(clock).mul(rate));
  return payout;
};

module.exports = {
  convertToBaseUnit,
  bn,
  ubiPayout,
};
