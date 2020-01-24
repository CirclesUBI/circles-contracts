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

const ubiPayout = (rate, clock, time, offset, inf, div, period) => {
  let payout = bn(0);
  let c = clock;
  let o = offset;
  let r = rate;
  // console.log("period", period.toString())
  // console.log("offset", offset.toString())
  // console.log("clock", clock.toString())
  // console.log("rate", rate.toString())
  // console.log("time", time.toString())
  while (c.add(o).lte(bn(time))) {
    payout = payout.add(o.mul(r));
    c = c.add(o);
    o = period;
    r = inflate(r, inf, div, 1);
  }
  payout = payout.add(bn(time).sub(c).mul(r));
  console.log("payout", payout.toString())
  return payout;
};

module.exports = {
  convertToBaseUnit,
  bn,
  ubiPayout,
};
