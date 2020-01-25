const { BigNumber, decimals } = require('./constants');

const decimalsMultiplier = (new BigNumber(10)).pow(decimals);
const convertToBaseUnit = number => (new BigNumber(number)).mul(decimalsMultiplier);
const bn = number => new BigNumber(number);

const inflate = (init, inf, div, periods) => {
  const q = inf.pow(bn(periods));
  const d = div.pow(bn(periods));
  return (init.mul(q)).div(d);
};

const near = (num, goal, onePayout) => {
  // console.log(onePayout.toString())
  // console.log(num.toString())
  // console.log(goal.toString())
  // console.log(num.eq(goal))
  // console.log(num.toString())
  // console.log(goal.sub(onePayout).toString())
  // console.log(num.eq(goal.sub(onePayout)))
  return num.eq(goal) || num.eq(goal.sub(onePayout)) || num.eq(goal.add(onePayout));
};

const ubiPayout = (rate, clock, time, offset, inf, div, period) => {
  let payout = bn(0);
  let c = clock;
  let o = offset;
  let r = rate;
  // console.log("period", period.toString())
  // console.log("offset", o.toString())
  // console.log("clock", c.toString())
  // console.log("rate", r.toString())
  // console.log("time", time.toString())
  while (c.add(o).lte(bn(time))) {
    payout = payout.add(o.mul(r));
    c = c.add(o);
    // console.log("c.add(o)", c.toString())
    o = period;
    // console.log("o = period", o.toString())
    r = inflate(r, inf, div, 1);
    // console.log("inflate(r)", r.toString())
  }
  payout = payout.add(bn(time).sub(c).mul(r));
  // console.log("payout", payout.toString())
  return payout;
};

module.exports = {
  convertToBaseUnit,
  inflate,
  bn,
  ubiPayout,
  near,
};
