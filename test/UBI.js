const { BigNumber } = require('./helpers/constants');
const { bn, convertToBaseUnit, ubiPayout, near, inflate } = require('./helpers/math');
const { assertRevert } = require('./helpers/assertRevert');
const { increase } = require('./helpers/increaseTime');
const { getTimestampFromTx } = require('./helpers/getTimestamp');

const Hub = artifacts.require('MockHub');
const Token = artifacts.require('Token');

const findPayout = async (_token, init, inf, div, per) => {
  const offset = await _token.inflationOffset();
  const lastTouched = await _token.lastTouched();
  const blocktime = await _token.time();
  const hubDeploy = await _token.hubDeploy();
  const payout = ubiPayout(init, lastTouched, blocktime, offset, inf, div, per, hubDeploy);
  return payout;
};

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

contract('UBI', ([_, owner, recipient, attacker, systemOwner]) => { // eslint-disable-line no-unused-vars
  let hub = null;
  let token = null;

  let inflation = bn(107);
  let divisor = bn(100);
  let period = bn(7885000000);
  const symbol = 'CRC';
  const tokenName = 'MyCoin';
  let initialPayout = convertToBaseUnit(100);

  // beforeEach(async () => {
  //   hub = await Hub.new(systemOwner, inflation, period, symbol, initialPayout, initialPayout);
  // });

  describe('issuance', () => {
    beforeEach(async () => {
      initialPayout = convertToBaseUnit(100);
      hub = await Hub.new(systemOwner, inflation, period, symbol, initialPayout, initialPayout);
    });

    it('returns the correct issuance at deployment', async () => {
      (await hub.issuance()).should.be.bignumber.equal(initialPayout);
    });

    it('returns the correct issuance after 1 period', async () => {
      await increase(period.toNumber());
      const q = inflation.pow(bn(1));
      const d = divisor.pow(bn(1));
      const compounded = (initialPayout.mul(q)).div(d);
      (await hub.issuance()).should.be.bignumber.equal(compounded);
    });

    it('returns the correct issuance after x period', async () => {
      const time = period.mul(bn(5));
      await increase(time.toNumber());
      const q = inflation.pow(bn(5));
      const d = divisor.pow(bn(5));
      const compounded = (initialPayout.mul(q)).div(d);
      (await hub.issuance()).should.be.bignumber.equal(compounded);
    });
  });

  describe('ubi payouts', () => {
    let deployTime;

    beforeEach(async () => {
      hub = await Hub.new(systemOwner, inflation, period, symbol, initialPayout, initialPayout);
      const signup = await hub.signup(tokenName, { from: owner });
      token = await Token.at(signup.logs[1].args.token);
      deployTime = await getTimestampFromTx(signup.logs[0].transactionHash, web3);
    });

    it('correctly calculates the ubi payout at deployment', async () => {
      const goal = await findPayout(token, initialPayout, inflation, divisor, period);
      const bal = await token.look();
      bal.should.bignumber.satisfy(() => near(bal, goal, initialPayout));
    });

    it('doesnt change balance at deployment', async () => {
      await token.update();
      const balance = await token.balanceOf(owner);
      (balance).should.bignumber.satisfy(() => near(balance, initialPayout, initialPayout));
    });

    it('correctly calculates the ubi payout after 1 period', async () => {
      await increase(period.toNumber());
      const inf = inflate(initialPayout, inflation, divisor, bn(1));
      const goal = await findPayout(token, initialPayout, inflation, divisor, period);
      const bal = await token.look();
      bal.should.bignumber.satisfy(() => near(bal, goal, inf));
    });

    it('look should return some balance after only a few seconds', async () => {
      await increase(10);
      const bal = await token.look();
      bal.should.not.bignumber.equal(bn(0));
    });

    it('updates owners balance with payout after 1 period', async () => {
      await increase(period.toNumber());
      const inf = inflate(initialPayout, inflation, divisor, bn(1));
      const goal = (await findPayout(token, initialPayout, inflation, divisor, period))
        .add(initialPayout);
      await token.update();
      const balance = await token.balanceOf(owner);
      balance.should.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('should update owners balance even if called by attacker', async () => {
      await increase(period.toNumber());
      const inf = inflate(initialPayout, inflation, divisor, bn(1));
      const goal = (await findPayout(token, initialPayout, inflation, divisor, period))
        .add(initialPayout);
      await token.update({ from: attacker });
      const balance = await token.balanceOf(owner);
      (balance).should.be.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('should not change attacker balance if called by attacker', async () => {
      await increase(period.toNumber());
      await token.update({ from: attacker });
      const balance = await token.balanceOf(attacker);
      (balance).should.be.bignumber.equal(bn(0));
    });

    it('should update lastTouched by period if exactly one period has passed', async () => {
      const timechange = period.toNumber();
      await increase(timechange);
      await token.update();
      const time = await token.lastTouched();
      const goal = bn(deployTime).add(bn(timechange));
      time.should.bignumber.satisfy(() => near(time, goal, bn(1)));
    });

    it('should update lastTouched by period+x if more than a period but less than two has passed', async () => {
      const timechange = period.toNumber() + 500;
      await increase(timechange);
      await token.update();
      const time = await token.lastTouched();
      const goal = bn(deployTime).add(bn(timechange));
      time.should.bignumber.satisfy(() => near(time, goal, bn(1)));
    });

    it('correctly calculates the ubi payout after x periods', async () => {
      const time = period.mul(bn(5));
      const inf = inflate(initialPayout, inflation, divisor, bn(5));
      await increase(time.toNumber());
      const goal = await findPayout(token, initialPayout, inflation, divisor, period);
      const balance = await token.look();
      balance.should.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('updates owners balance with payout after x periods', async () => {
      const time = period.mul(bn(5));
      const inf = inflate(initialPayout, inflation, divisor, bn(5));
      await increase(time.toNumber());
      const goal = (await findPayout(token, initialPayout, inflation, divisor, period))
        .add(initialPayout);
      await token.update();
      const balance = await token.balanceOf(owner);
      balance.should.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('updates owners balance with payout after x periods when update is called multiple times', async () => {
      const lastTouched = await token.lastTouched();
      const inf = inflate(initialPayout, inflation, divisor, bn(4));
      const offset = await token.inflationOffset();
      const hubDeploy = await token.hubDeploy();
      await increase(period.toNumber());
      await token.update();
      await increase(period.toNumber());
      await token.update();
      await increase(period.toNumber());
      await token.update();
      await increase(period.toNumber());
      await token.update();
      const blocktime = await token.time();
      const goal = (ubiPayout(
        initialPayout, lastTouched, blocktime, offset, inflation, divisor, period, hubDeploy))
        .add(initialPayout);
      const balance = await token.balanceOf(owner);
      balance.should.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('should update lastTouched by period if x period has passed', async () => {
      const timechange = period.mul(bn(5));
      await increase(timechange.toNumber());
      await token.update();
      const lastTouched = await token.lastTouched();
      const goal = bn(deployTime).add(timechange);
      lastTouched.should.bignumber.satisfy(() => near(lastTouched, goal, bn(1)));
    });

    it('should update lastTouched by period+z if more x but less than y periods have passed', async () => {
      const timechange = (period.mul(bn(5))).toNumber() + 500;
      await increase(timechange);
      await token.update();
      const lastTouched = await token.lastTouched();
      const goal = bn(deployTime).add(bn(timechange));
      lastTouched.should.bignumber.satisfy(() => near(lastTouched, goal, bn(1)));
    });

    it('should not update lastTouched if update isnt called', async () => {
      const time = period.mul(bn(2));
      await increase(time.toNumber() + 500);
      const lastTouched = await token.lastTouched();
      (lastTouched).should.be.bignumber.equal(bn(deployTime));
    });
  });

  describe('ubi payouts - with different config params', () => {
    let deployTime;
    let startingRate;

    beforeEach(async () => {
      period = bn(86400);
      divisor = bn(1000);
      inflation = bn(1035);
      initialPayout = convertToBaseUnit(100);
      startingRate = bn(80);
      hub = await Hub.new(systemOwner, inflation, period, symbol, initialPayout, startingRate);
      const signup = await hub.signup(tokenName, { from: owner, gas: 6721975 });
      token = await Token.at(signup.logs[1].args.token);
      deployTime = await getTimestampFromTx(signup.logs[0].transactionHash, web3);
    });

    it('correctly calculates the ubi payout at deployment', async () => {
      const goal = await findPayout(token, startingRate, inflation, divisor, period);
      const bal = await token.look();
      bal.should.bignumber.satisfy(() => near(bal, goal, startingRate));
    });

    it('doesnt change balance at deployment', async () => {
      await token.update();
      const balance = await token.balanceOf(owner);
      (balance).should.bignumber.satisfy(() => near(balance, initialPayout, startingRate));
    });

    it('correctly calculates the ubi payout after 1 period', async () => {
      await increase(period.toNumber());
      const inf = inflate(startingRate, inflation, divisor, bn(1));
      const goal = await findPayout(token, startingRate, inflation, divisor, period);
      const bal = await token.look();
      bal.should.bignumber.satisfy(() => near(bal, goal, inf));
    });

    it('updates owners balance with payout after 1 period', async () => {
      await increase(period.toNumber());
      const inf = inflate(startingRate, inflation, divisor, bn(1));
      const goal = (await findPayout(token, startingRate, inflation, divisor, period))
        .add(initialPayout);
      await token.update();
      const balance = await token.balanceOf(owner);
      balance.should.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('should update owners balance even if called by attacker', async () => {
      await increase(period.toNumber());
      const inf = inflate(startingRate, inflation, divisor, bn(1));
      const goal = (await findPayout(token, startingRate, inflation, divisor, period))
        .add(initialPayout);
      await token.update({ from: attacker });
      const balance = await token.balanceOf(owner);
      (balance).should.be.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('should not change attacker balance if called by attacker', async () => {
      await increase(period.toNumber());
      await token.update({ from: attacker });
      const balance = await token.balanceOf(attacker);
      (balance).should.be.bignumber.equal(bn(0));
    });

    it('should update lastTouched by period if exactly one period has passed', async () => {
      const timechange = period.toNumber();
      await increase(timechange);
      await token.update();
      const time = await token.lastTouched();
      const goal = bn(deployTime).add(bn(timechange));
      time.should.bignumber.satisfy(() => near(time, goal, bn(1)));
    });

    it('should update lastTouched by period+x if more than a period but less than two has passed', async () => {
      const timechange = period.toNumber() + 500;
      await increase(timechange);
      await token.update();
      const time = await token.lastTouched();
      const goal = bn(deployTime).add(bn(timechange));
      time.should.bignumber.satisfy(() => near(time, goal, bn(1)));
    });

    it('correctly calculates the ubi payout after x periods', async () => {
      const time = period.mul(bn(5));
      const inf = inflate(startingRate, inflation, divisor, bn(5));
      await increase(time.toNumber());
      const goal = await findPayout(token, startingRate, inflation, divisor, period);
      const balance = await token.look();
      balance.should.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('updates owners balance with payout after x periods', async () => {
      const time = period.mul(bn(5));
      const inf = inflate(startingRate, inflation, divisor, bn(5));
      await increase(time.toNumber());
      const goal = (await findPayout(token, startingRate, inflation, divisor, period))
        .add(initialPayout);
      await token.update();
      const balance = await token.balanceOf(owner);
      balance.should.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('updates owners balance with payout after x periods when update is called multiple times', async () => {
      const lastTouched = await token.lastTouched();
      const inf = inflate(startingRate, inflation, divisor, bn(4));
      const offset = await token.inflationOffset();
      const hubDeploy = await token.hubDeploy();
      await increase(period.toNumber());
      await token.update();
      await increase(period.toNumber());
      await token.update();
      await increase(period.toNumber());
      await token.update();
      await increase(period.toNumber());
      await token.update();
      const blocktime = await token.time();
      const goal = (ubiPayout(
        startingRate, lastTouched, blocktime, offset, inflation, divisor, period, hubDeploy))
        .add(initialPayout);
      const balance = await token.balanceOf(owner);
      balance.should.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('should update lastTouched by period if x period has passed', async () => {
      const timechange = period.mul(bn(5));
      await increase(timechange.toNumber());
      await token.update();
      const lastTouched = await token.lastTouched();
      const goal = bn(deployTime).add(timechange);
      lastTouched.should.bignumber.satisfy(() => near(lastTouched, goal, bn(1)));
    });

    it('should update lastTouched by period+z if more x but less than y periods have passed', async () => {
      const timechange = (period.mul(bn(5))).toNumber() + 500;
      await increase(timechange);
      await token.update();
      const lastTouched = await token.lastTouched();
      const goal = bn(deployTime).add(bn(timechange));
      lastTouched.should.bignumber.satisfy(() => near(lastTouched, goal, bn(1)));
    });

    it('should not update lastTouched if update isnt called', async () => {
      const time = period.mul(bn(2));
      await increase(time.toNumber() + 500);
      const lastTouched = await token.lastTouched();
      (lastTouched).should.be.bignumber.equal(bn(deployTime));
    });
  });
});
