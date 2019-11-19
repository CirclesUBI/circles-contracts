const truffleContract = require('truffle-contract');

const { BigNumber, ZERO_ADDRESS, decimals } = require('./helpers/constants');
const { bn, convertToBaseUnit, ubiPayout } = require('./helpers/math');
const { assertRevert } = require('./helpers/assertRevert');
const { increase } = require('./helpers/increaseTime');
const { getTimestamp } = require('./helpers/getTimestamp');

const Hub = artifacts.require('Hub');
const Token = artifacts.require('Token');

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
  const initialPayout = convertToBaseUnit(100);

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, inflation, divisor, period, symbol, initialPayout);
  });

  describe('power', () => {
    it('returns the result of base^exponent', async () => {
      (await hub.pow(2, 4)).should.be.bignumber.equal(bn(16));
    });

    it('returns the result of base^exponent for a very high number', async () => {
      (await hub.pow(15833, 12)).should.be.bignumber.equal(bn('248175291811094805747824732449565240388888669248161'));
    });

    it('returns the result of base^exponent for base=1', async () => {
      (await hub.pow(1, 12)).should.be.bignumber.equal(bn('1'));
    });

    it('returns the result of base^exponent for base=0', async () => {
      (await hub.pow(0, 12)).should.be.bignumber.equal(bn('0'));
    });

    it('returns the result of base^exponent for exponent=1', async () => {
      (await hub.pow(12, 1)).should.be.bignumber.equal(bn('12'));
    });

    it('returns the result of base^exponent for base=0 exponent=1', async () => {
      (await hub.pow(0, 1)).should.be.bignumber.equal(bn('0'));
    });

    it('returns the result of base^exponent for exponent=0', async () => {
      (await hub.pow(12, 0)).should.be.bignumber.equal(bn('1'));
    });

    it('should throw on overflow', async () => {
      await assertRevert(hub.pow(12, 583333333))
    });
  });

  describe('issuance', () => {
    beforeEach(async () => {
      hub = await Hub.new(systemOwner, inflation, divisor, period, symbol, initialPayout);
    });

    it('returns the correct issuance at deployment', async () => {
      (await hub.issuance()).should.be.bignumber.equal(convertToBaseUnit(100));
    });

    it('returns the correct issuance after 1 period', async () => {
      await increase(period.toNumber());
      const q = inflation.pow(bn(1));
      const d = divisor.pow(bn(1));
      const compounded = (initialPayout.mul(q)).div(d);
      (await hub.issuance()).should.be.bignumber.equal(compounded);
    });

    it('returns the correct issuance after x period', async () => {
      const time = period.mul(bn(5))
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
      hub = await Hub.new(systemOwner, inflation, divisor, period, symbol, initialPayout);
      const signup = await hub.signup(tokenName, { from: owner });
      token = await Token.at(signup.logs[1].args.token);
      deployTime = await getTimestamp(signup.logs[0].transactionHash, web3)
    });

    it('correctly calculates the ubi payout at deployment', async () => {
      const bal = ubiPayout(initialPayout, inflation, divisor, bn(0));
      (await token.look()).should.be.bignumber.equal(bal);
    });

    it('doesnt change balance at deployment', async () => {
      await token.update();
      const balance = await token.balanceOf(owner);
      (balance).should.be.bignumber.equal(initialPayout);
    });

    it('doesnt change timestamp if no payout was made', async () => {
      await token.update();
      const time = await token.lastTouched();
      (time).should.be.bignumber.equal(bn(deployTime));
    });

    it('doesnt change timestamp if no payout was made, even if time increased', async () => {
      await increase(50);
      await token.update();
      const time = await token.lastTouched();
      (time).should.be.bignumber.equal(bn(deployTime));
    });

    it('should not change no matter how many times you call update if 0 periods', async () => {
      const goalBal = ubiPayout(initialPayout, inflation, divisor, bn(1));
      await token.update();
      await token.update();
      await token.update();
      await token.update();
      const balance = await token.balanceOf(owner);
      (balance).should.be.bignumber.equal(goalBal);
    });

    it('correctly calculates the ubi payout after 1 period', async () => {
      await increase(period.toNumber());
      const bal = ubiPayout(initialPayout, inflation, divisor, bn(2));
      (await token.look()).should.be.bignumber.equal(bal.sub(initialPayout));
    });

    it('updates owners balance with payout after 1 period', async () => {
      await increase(period.toNumber());
      const goalBal = ubiPayout(initialPayout, inflation, divisor, bn(2));
      const k = await token.look();
      await token.update();
      const balance = await token.balanceOf(owner);
      (balance).should.be.bignumber.equal(goalBal);
    });

    it('should update owners balance even if called by attacker', async () => {
      await increase(period.toNumber());
      const goalBal = ubiPayout(initialPayout, inflation, divisor, bn(2));
      await token.update({ from: attacker });
      const balance = await token.balanceOf(owner);
      (balance).should.be.bignumber.equal(goalBal);
    });

    it('should not change attacker balance if called by attacker', async () => {
      await increase(period.toNumber());
      await token.update({ from: attacker });
      const balance = await token.balanceOf(attacker);
      (balance).should.be.bignumber.equal(bn(0));
    });

    it('should update lastTouched by period if exactly one period has passed', async () => {
      await increase(period.toNumber());
      await token.update();
      const u = await token.periods();
      const time = await token.lastTouched();
      (time).should.be.bignumber.equal(bn(deployTime).add(period));
    });

    it('should update lastTouched by period if more than a period but less than two has passed', async () => {
      await increase(period.toNumber()+500);
      await token.update();
      const time = await token.lastTouched();
      (time).should.be.bignumber.equal(bn(deployTime).add(period));
    });

    it('correctly calculates the ubi payout after x periods', async () => {
      const time = period.mul(bn(5))
      await increase(time.toNumber());
      const bal = ubiPayout(initialPayout, inflation, divisor, bn(5));
      (await token.look()).should.be.bignumber.equal(bal.sub(initialPayout));
    });

    it('updates owners balance with payout after x periods', async () => {
      const time = period.mul(bn(5))
      await increase(time.toNumber());
      const goalBal = ubiPayout(initialPayout, inflation, divisor, bn(5));
      await token.update();
      const balance = await token.balanceOf(owner);
      (balance).should.be.bignumber.equal(goalBal);
    });

    it('should update lastTouched by period if x period has passed', async () => {
      const time = period.mul(bn(5))
      await increase(time.toNumber());
      await token.update();
      const lastTouched = await token.lastTouched();
      (lastTouched).should.be.bignumber.equal(bn(deployTime).add(time));
    });

    it('should update lastTouched by period if more x but less than y periods have passed', async () => {
      const time = period.mul(bn(5))
      await increase(time.toNumber()+500);
      await token.update();
      const lastTouched = await token.lastTouched();
      (lastTouched).should.be.bignumber.equal(bn(deployTime).add(time));
    });

    it('should update balance twice if two periods pass, regardless of how update is called', async () => {
      await increase(period.toNumber());
      await token.update();
      await increase(period.toNumber()+500);
      await token.update();
      const goalBal = ubiPayout(initialPayout, inflation, divisor, bn(3));
      const balance = await token.balanceOf(owner);
      (balance).should.be.bignumber.equal(goalBal);
    });

    it('should update balance lastTouched twice if two periods pass, regardless of how update is called', async () => {
      await increase(period.toNumber());
      await token.update();
      await increase(period.toNumber()+500);
      await token.update();
      const lastTouched = await token.lastTouched();
      const timePassed = bn(deployTime).add(period.mul(bn(2)));
      (lastTouched).should.be.bignumber.equal(timePassed);
    });

    it('should not update lastTouched if update isnt called', async () => {
      const time = period.mul(bn(2))
      await increase(time.toNumber()+500);
      const lastTouched = await token.lastTouched();
      (lastTouched).should.be.bignumber.equal(bn(deployTime));
    });
  });

  describe('ubi payouts - with different config params', () => {
    let deployTime;
    period = bn(86400);
    divisor = bn(1000000);
    inflation = bn(1019178);

    beforeEach(async () => {
      hub = await Hub.new(systemOwner, inflation, divisor, period, symbol, initialPayout);
      const signup = await hub.signup(tokenName, { from: owner });
      token = await Token.at(signup.logs[1].args.token);
      deployTime = await getTimestamp(signup.logs[0].transactionHash, web3)
    });

    it('correctly calculates the ubi payout at deployment', async () => {
      const bal = ubiPayout(initialPayout, inflation, divisor, bn(0));
      (await token.look()).should.be.bignumber.equal(bal);
    });

    it('doesnt change balance at deployment', async () => {
      await token.update();
      const balance = await token.balanceOf(owner);
      (balance).should.be.bignumber.equal(initialPayout);
    });

    it('doesnt change timestamp if no payout was made', async () => {
      await token.update();
      const time = await token.lastTouched();
      (time).should.be.bignumber.equal(bn(deployTime));
    });

    it('doesnt change timestamp if no payout was made, even if time increased', async () => {
      await increase(50);
      await token.update();
      const time = await token.lastTouched();
      (time).should.be.bignumber.equal(bn(deployTime));
    });

    it('should not change no matter how many times you call update if 0 periods', async () => {
      const goalBal = ubiPayout(initialPayout, inflation, divisor, bn(1));
      await token.update();
      await token.update();
      await token.update();
      await token.update();
      const balance = await token.balanceOf(owner);
      (balance).should.be.bignumber.equal(goalBal);
    });

    it('correctly calculates the ubi payout after 1 period', async () => {
      await increase(period.toNumber());
      const bal = ubiPayout(initialPayout, inflation, divisor, bn(2));
      (await token.look()).should.be.bignumber.equal(bal.sub(initialPayout));
    });

    it('updates owners balance with payout after 1 period', async () => {
      await increase(period.toNumber());
      const goalBal = ubiPayout(initialPayout, inflation, divisor, bn(2));
      const k = await token.look();
      await token.update();
      const balance = await token.balanceOf(owner);
      (balance).should.be.bignumber.equal(goalBal);
    });

    it('should update owners balance even if called by attacker', async () => {
      await increase(period.toNumber());
      const goalBal = ubiPayout(initialPayout, inflation, divisor, bn(2));
      await token.update({ from: attacker });
      const balance = await token.balanceOf(owner);
      (balance).should.be.bignumber.equal(goalBal);
    });

    it('should not change attacker balance if called by attacker', async () => {
      await increase(period.toNumber());
      await token.update({ from: attacker });
      const balance = await token.balanceOf(attacker);
      (balance).should.be.bignumber.equal(bn(0));
    });

    it('should update lastTouched by period if exactly one period has passed', async () => {
      await increase(period.toNumber());
      await token.update();
      const u = await token.periods();
      const time = await token.lastTouched();
      (time).should.be.bignumber.equal(bn(deployTime).add(period));
    });

    it('should update lastTouched by period if more than a period but less than two has passed', async () => {
      await increase(period.toNumber()+500);
      await token.update();
      const time = await token.lastTouched();
      (time).should.be.bignumber.equal(bn(deployTime).add(period));
    });

    it('correctly calculates the ubi payout after x periods', async () => {
      const time = period.mul(bn(5))
      await increase(time.toNumber());
      const bal = ubiPayout(initialPayout, inflation, divisor, bn(5));
      (await token.look()).should.be.bignumber.equal(bal.sub(initialPayout));
    });

    it('updates owners balance with payout after x periods', async () => {
      const time = period.mul(bn(5))
      await increase(time.toNumber());
      const goalBal = ubiPayout(initialPayout, inflation, divisor, bn(5));
      await token.update();
      const balance = await token.balanceOf(owner);
      (balance).should.be.bignumber.equal(goalBal);
    });

    it('should update lastTouched by period if x period has passed', async () => {
      const time = period.mul(bn(5))
      await increase(time.toNumber());
      await token.update();
      const lastTouched = await token.lastTouched();
      (lastTouched).should.be.bignumber.equal(bn(deployTime).add(time));
    });

    it('should update lastTouched by period if more x but less than y periods have passed', async () => {
      const time = period.mul(bn(5))
      await increase(time.toNumber()+500);
      await token.update();
      const lastTouched = await token.lastTouched();
      (lastTouched).should.be.bignumber.equal(bn(deployTime).add(time));
    });
  });
});
