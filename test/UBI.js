const {
  BigNumber,
  maxGas,
  symbol,
  name,
  timeout,
} = require('./helpers/constants');
const { bn, convertToBaseUnit, ubiPayout, near, inflate } = require('./helpers/math');
const { increase } = require('./helpers/increaseTime');
const { getTimestampFromTx } = require('./helpers/getTimestamp');

const Hub = artifacts.require('MockHub');
const Token = artifacts.require('Token');

const findPayout = async (_token, init, inf, div, per) => {
  const offset = await _token.inflationOffset();
  const lastTouched = await _token.lastTouched();
  const blocktime = await _token.time();
  const hubDeployedAt = await _token.hubDeployedAt();
  const payout = ubiPayout(init, lastTouched, blocktime, offset, inf, div, per, hubDeployedAt);
  return payout;
};

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

contract('UBI', ([_, owner, recipient, attacker, systemOwner]) => { // eslint-disable-line no-unused-vars
  let hub = null;
  let token = null;

  let divisor = bn(100);
  let inflation = bn(275);
  let period = bn(7885000000);
  let signupBonus = convertToBaseUnit(100);

  describe('issuance', () => {
    beforeEach(async () => {
      signupBonus = convertToBaseUnit(100);
      hub = await Hub
        .new(
          inflation,
          period,
          symbol,
          name,
          signupBonus,
          signupBonus,
          timeout,
          { from: systemOwner, gas: maxGas },
        );
    });

    it('returns the correct issuance at deployment', async () => {
      (await hub.issuance()).should.be.bignumber.equal(signupBonus);
    });

    it('returns the correct issuance after 1 period', async () => {
      await increase(period.toNumber());
      const q = inflation.pow(bn(1));
      const d = divisor.pow(bn(1));
      const compounded = (signupBonus.mul(q)).div(d);
      (await hub.issuance()).should.be.bignumber.equal(compounded);
    });

    it('returns the correct issuance after x period', async () => {
      const time = period.mul(bn(5));
      await increase(time.toNumber());
      const q = inflation.pow(bn(5));
      const d = divisor.pow(bn(5));
      const compounded = (signupBonus.mul(q)).div(d);
      (await hub.issuance()).should.be.bignumber.equal(compounded);
    });
  });

  describe('ubi payouts', () => {
    let deployTime;

    beforeEach(async () => {
      hub = await Hub
        .new(
          inflation,
          period,
          symbol,
          name,
          signupBonus,
          signupBonus,
          period.mul(bn(10)),
          { from: systemOwner, gas: maxGas },
        );
      const signup = await hub.signup({ from: owner });
      token = await Token.at(signup.logs[1].args.token);
      deployTime = await getTimestampFromTx(signup.logs[0].transactionHash, web3);
    });

    it('correctly calculates the ubi payout at deployment', async () => {
      const goal = await findPayout(token, signupBonus, inflation, divisor, period);
      const bal = await token.look();
      bal.should.bignumber.satisfy(() => near(bal, goal, signupBonus));
    });

    it('doesnt change balance at deployment', async () => {
      await token.update();
      const balance = await token.balanceOf(owner);
      (balance).should.bignumber.satisfy(() => near(balance, signupBonus, signupBonus));
    });

    it('correctly calculates the ubi payout after 1 period', async () => {
      await increase(period.toNumber());
      const inf = inflate(signupBonus, inflation, divisor, bn(1));
      const goal = await findPayout(token, signupBonus, inflation, divisor, period);
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
      const inf = inflate(signupBonus, inflation, divisor, bn(1));
      const goal = (await findPayout(token, signupBonus, inflation, divisor, period))
        .add(signupBonus);
      await token.update();
      const balance = await token.balanceOf(owner);
      balance.should.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('should update owners balance even if called by attacker', async () => {
      await increase(period.toNumber());
      const inf = inflate(signupBonus, inflation, divisor, bn(1));
      const goal = (await findPayout(token, signupBonus, inflation, divisor, period))
        .add(signupBonus);
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

    it('should not update inflationOffset if exactly one period has passed', async () => {
      const goal = await token.inflationOffset();
      const timechange = period.toNumber();
      await increase(timechange);
      await token.update();
      const offset = await token.inflationOffset();
      offset.should.bignumber.satisfy(() => near(offset, goal, bn(1)));
    });

    it('should update lastTouched by period+x if more than a period but less than two has passed', async () => {
      const timechange = period.toNumber() + 500;
      await increase(timechange);
      await token.update();
      const time = await token.lastTouched();
      const goal = bn(deployTime).add(bn(timechange));
      time.should.bignumber.satisfy(() => near(time, goal, bn(1)));
    });

    it('should update inflationOffset by x if period+x has passed', async () => {
      const goal = (await token.inflationOffset()).sub(bn(500));
      const timechange = period.toNumber() + 500;
      await increase(timechange);
      await token.update();
      const offset = await token.inflationOffset();
      offset.should.bignumber.satisfy(() => near(offset, goal, bn(1)));
    });

    it('correctly calculates the ubi payout after x periods', async () => {
      const time = period.mul(bn(5));
      const inf = inflate(signupBonus, inflation, divisor, bn(5));
      await increase(time.toNumber());
      const goal = await findPayout(token, signupBonus, inflation, divisor, period);
      const balance = await token.look();
      balance.should.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('updates owners balance with payout after x periods', async () => {
      const time = period.mul(bn(5));
      const inf = inflate(signupBonus, inflation, divisor, bn(5));
      await increase(time.toNumber());
      const goal = (await findPayout(token, signupBonus, inflation, divisor, period))
        .add(signupBonus);
      await token.update();
      const balance = await token.balanceOf(owner);
      balance.should.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('updates owners balance with payout after x periods when update is called multiple times', async () => {
      const lastTouched = await token.lastTouched();
      const inf = inflate(signupBonus, inflation, divisor, bn(4));
      const offset = await token.inflationOffset();
      const hubDeployedAt = await token.hubDeployedAt();
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
        signupBonus, lastTouched, blocktime, offset, inflation, divisor, period, hubDeployedAt))
        .add(signupBonus);
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

    it('should show no payable ubi if manually stopped', async () => {
      const time = period.mul(bn(2));
      await increase(time.toNumber() + 500);
      await token.stop({ from: owner });
      const bal = await token.look();
      bal.should.be.bignumber.equal(bn(0));
    });

    it('should return that it is stopped when it has been manually stopped', async () => {
      await token.stop({ from: owner });
      const isStopped = await token.stopped();
      isStopped.should.be.equal(true);
    });

    it('should not payout ubi if manually stopped', async () => {
      const time = period.mul(bn(2));
      await increase(time.toNumber() + 500);
      const bal = await token.balanceOf(owner);
      await token.stop({ from: owner });
      await token.update();
      (await token.balanceOf(owner)).should.be.bignumber.equal(bal);
    });

    it('should show no payable ubi if expired', async () => {
      const time = period.mul(bn(11));
      await increase(time.toNumber());
      const bal = await token.look();
      bal.should.be.bignumber.equal(bn(0));
    });

    it('should return that it is stopped when it has expired', async () => {
      const time = period.mul(bn(11));
      await increase(time.toNumber());
      const isStopped = await token.stopped();
      isStopped.should.be.equal(true);
    });

    it('should not payout ubi if expired', async () => {
      const time = period.mul(bn(11));
      await increase(time.toNumber());
      const bal = await token.balanceOf(owner);
      await token.update();
      (await token.balanceOf(owner)).should.be.bignumber.equal(bal);
    });
  });

  describe('ubi payouts - with different config params', () => {
    let deployTime;
    let startingIssuance;

    beforeEach(async () => {
      period = bn(86400);
      divisor = bn(1000);
      inflation = bn(1035);
      signupBonus = convertToBaseUnit(100);
      startingIssuance = bn(80);
      hub = await Hub
        .new(
          inflation,
          period,
          symbol,
          name,
          signupBonus,
          startingIssuance,
          timeout,
          { from: systemOwner, gas: maxGas },
        );
      const signup = await hub.signup({ from: owner, gas: 6721975 });
      token = await Token.at(signup.logs[1].args.token);
      deployTime = await getTimestampFromTx(signup.logs[0].transactionHash, web3);
    });

    it('correctly calculates the ubi payout at deployment', async () => {
      const goal = await findPayout(token, startingIssuance, inflation, divisor, period);
      const bal = await token.look();
      bal.should.bignumber.satisfy(() => near(bal, goal, startingIssuance));
    });

    it('should show no payable ubi if timeout is shorter than period', async () => {
      const period = new BigNumber(7885000000);
      const timeout = new BigNumber(7885000000-1);
      
      hubTimeoutShorterThanPeriod = await Hub
        .new(
          inflation,
          period,
          symbol,
          name,
          signupBonus,
          startingIssuance,
          timeout,
          { from: systemOwner, gas: maxGas },
        );
      const signup = await hubTimeoutShorterThanPeriod.signup({ from: owner, gas: 6721975 });
      token = await Token.at(signup.logs[1].args.token);
      deployTime = await getTimestampFromTx(signup.logs[0].transactionHash, web3);

      const time = period.mul(bn(2));
      await increase(time.toNumber() + 500);
      await token.stop({ from: owner });
      const bal = await token.look();
      bal.should.be.bignumber.equal(bn(0));
    });

    it('doesnt change balance at deployment', async () => {
      await token.update();
      const balance = await token.balanceOf(owner);
      (balance).should.bignumber.satisfy(() => near(balance, signupBonus, startingIssuance));
    });

    it('correctly calculates the ubi payout after 1 period', async () => {
      await increase(period.toNumber());
      const inf = inflate(startingIssuance, inflation, divisor, bn(1));
      const goal = await findPayout(token, startingIssuance, inflation, divisor, period);
      const bal = await token.look();
      bal.should.bignumber.satisfy(() => near(bal, goal, inf));
    });

    it('updates owners balance with payout after 1 period', async () => {
      await increase(period.toNumber());
      const inf = inflate(startingIssuance, inflation, divisor, bn(1));
      const goal = (await findPayout(token, startingIssuance, inflation, divisor, period))
        .add(signupBonus);
      await token.update();
      const balance = await token.balanceOf(owner);
      balance.should.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('should update owners balance even if called by attacker', async () => {
      await increase(period.toNumber());
      const inf = inflate(startingIssuance, inflation, divisor, bn(1));
      const goal = (await findPayout(token, startingIssuance, inflation, divisor, period))
        .add(signupBonus);
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
      const inf = inflate(startingIssuance, inflation, divisor, bn(5));
      await increase(time.toNumber());
      const goal = await findPayout(token, startingIssuance, inflation, divisor, period);
      const balance = await token.look();
      balance.should.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('updates owners balance with payout after x periods', async () => {
      const time = period.mul(bn(5));
      const inf = inflate(startingIssuance, inflation, divisor, bn(5));
      await increase(time.toNumber());
      const goal = (await findPayout(token, startingIssuance, inflation, divisor, period))
        .add(signupBonus);
      await token.update();
      const balance = await token.balanceOf(owner);
      balance.should.bignumber.satisfy(() => near(balance, goal, inf));
    });

    it('updates owners balance with payout after x periods when update is called multiple times', async () => {
      const lastTouched = await token.lastTouched();
      const inf = inflate(startingIssuance, inflation, divisor, bn(4));
      const offset = await token.inflationOffset();
      const hubDeployedAt = await token.hubDeployedAt();
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
        startingIssuance, lastTouched, blocktime, offset, inflation, divisor, period, hubDeployedAt))
        .add(signupBonus);
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
