const { BigNumber } = require('./helpers/constants');
const { bn, convertToBaseUnit } = require('./helpers/math');
const { assertRevert } = require('./helpers/assertRevert');
const { increase } = require('./helpers/increaseTime');

const Hub = artifacts.require('MockHub');

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

contract('Hub - math utils', ([_, owner, recipient, attacker, systemOwner]) => { // eslint-disable-line no-unused-vars
  let hub = null;

  let inflation = bn(107);
  let divisor = bn(100);
  let period = bn(7885000000);
  const symbol = 'CRC';
  const initialPayout = convertToBaseUnit(100);

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, inflation, period, symbol, initialPayout, initialPayout);
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
      await assertRevert(hub.pow(12, 583333333));
    });
  });

  describe('issuance', () => {
    beforeEach(async () => {
      hub = await Hub.new(systemOwner, inflation, period, symbol, initialPayout, initialPayout);
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
      const time = period.mul(bn(5));
      await increase(time.toNumber());
      const q = inflation.pow(bn(5));
      const d = divisor.pow(bn(5));
      const compounded = (initialPayout.mul(q)).div(d);
      (await hub.issuance()).should.be.bignumber.equal(compounded);
    });
  });

  describe('finds correct divisor', () => {
    it('returns the correct divisor for 6790007', async () => {
      inflation = bn(6790007);
      hub = await Hub.new(systemOwner, inflation, period, symbol, initialPayout, initialPayout);
      (await hub.divisor()).should.be.bignumber.equal(bn(1000000));
    });

    it('returns the correct divisor for 7', async () => {
      inflation = bn(7);
      hub = await Hub.new(systemOwner, inflation, period, symbol, initialPayout, initialPayout);
      (await hub.divisor()).should.be.bignumber.equal(bn(1));
    });

    it('returns the correct divisor for 10', async () => {
      inflation = bn(10);
      hub = await Hub.new(systemOwner, inflation, period, symbol, initialPayout, initialPayout);
      (await hub.divisor()).should.be.bignumber.equal(bn(10));
    });

    it('returns the correct divisor for 0', async () => {
      inflation = bn(0);
      hub = await Hub.new(systemOwner, inflation, period, symbol, initialPayout, initialPayout);
      (await hub.divisor()).should.be.bignumber.equal(bn(1));
    });

    it('returns the correct divisor for 10000', async () => {
      inflation = bn(10000);
      hub = await Hub.new(systemOwner, inflation, period, symbol, initialPayout, initialPayout);
      (await hub.divisor()).should.be.bignumber.equal(bn(10000));
    });
  });
});

