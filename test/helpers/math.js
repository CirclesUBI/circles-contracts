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
  return num.eq(goal) || num.eq(goal.sub(onePayout)) || num.eq(goal.add(onePayout));
};

const periodsLastTouched = (clock, hubDeploy, period) => clock.sub(hubDeploy).div(period);

const ubiPayout = (rate, clock, time, offset, inf, div, period, hubDeploy) => {
  let payout = bn(0);
  let c = clock;
  let o = offset;
  let r = rate;
  let p = periodsLastTouched(c, hubDeploy, period);
  while (c.add(o).lte(bn(time))) {
    payout = payout.add(o.mul(r));
    c = c.add(o);
    o = period;
    p = p.add(bn(1));
    r = inflate(rate, inf, div, p);
  }
  const timePassed = bn(time).sub(c);
  payout = payout.add(timePassed.mul(r));
  return payout;
};

module.exports = {
  convertToBaseUnit,
  inflate,
  bn,
  ubiPayout,
  near,
};
