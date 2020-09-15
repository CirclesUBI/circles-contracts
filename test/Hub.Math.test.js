const {
  BigNumber,
  period,
  symbol,
  initialPayout,
  maxGas,
  timeout,
} = require('./helpers/constants');
const { bn, convertToBaseUnit, inflate } = require('./helpers/math');
const { assertRevert } = require('./helpers/assertRevert');
const { increase } = require('./helpers/increaseTime');

const Hub = artifacts.require('MockHub');

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

contract('Hub - math utils', ([_, owner, recipient, attacker, systemOwner]) => { // eslint-disable-line no-unused-vars
  let hub = null;

  let inflation = bn(275);
  const divisor = bn(100);
  const initialConverted = convertToBaseUnit(initialPayout);

  beforeEach(async () => {
    hub = await Hub
      .new(
        systemOwner,
        inflation,
        period,
        symbol,
        initialConverted,
        initialConverted,
        timeout,
        { from: systemOwner, gas: maxGas },
      );
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

  describe('periods', () => {
    it('returns the correct period', async () => {
      (await hub.period()).should.be.bignumber.equal(period);
    });

    it('returns 0 before a full period has passed', async () => {
      (await hub.periods()).should.be.bignumber.equal(bn(0));
    });

    it('returns the correct number of periods after 1 period has passed', async () => {
      const time = period.mul(bn(1));
      await increase(time.toNumber());
      (await hub.periods()).should.be.bignumber.equal(bn(1));
    });

    it('returns the correct number of periods after 1+x period has passed', async () => {
      const time = period.mul(bn(1)).toNumber() + 500;
      await increase(time);
      (await hub.periods()).should.be.bignumber.equal(bn(1));
    });

    it('returns the correct number of periods after x period has passed', async () => {
      const time = period.mul(bn(8));
      await increase(time.toNumber());
      (await hub.periods()).should.be.bignumber.equal(bn(8));
    });

    it('returns the correct number of periods after x-1 period has passed', async () => {
      const time = period.mul(bn(8)).toNumber() - 1;
      await increase(time);
      (await hub.periods()).should.be.bignumber.equal(bn(7));
    });
  });

  describe('issuance', () => {
    it('returns the correct issuance at deployment', async () => {
      (await hub.issuance()).should.be.bignumber.equal(convertToBaseUnit(100));
    });

    it('returns the correct issuance after 1 period', async () => {
      await increase(period.toNumber());
      const compounded = inflate(initialConverted, inflation, divisor, bn(1));
      (await hub.issuance()).should.be.bignumber.equal(compounded);
    });

    it('returns the correct issuance after x period', async () => {
      const numPeriods = bn(5);
      const time = period.mul(numPeriods);
      await increase(time.toNumber());
      const compounded = inflate(initialConverted, inflation, divisor, numPeriods);
      (await hub.issuance()).should.be.bignumber.equal(compounded);
    });
  });

  describe('inflate', () => {
    it('returns the correct inflation with no periods passed', async () => {
      hub = await Hub
        .new(
          systemOwner,
          inflation,
          period,
          symbol,
          initialConverted,
          initialConverted,
          timeout,
          { from: systemOwner, gas: maxGas },
        );
      (await hub.inflate(initialConverted, 0)).should.be.bignumber.equal(initialConverted);
    });

    it('returns the correct inflation with 1 period passed', async () => {
      hub = await Hub
        .new(
          systemOwner,
          inflation,
          period,
          symbol,
          initialConverted,
          initialConverted,
          timeout,
          { from: systemOwner, gas: maxGas },
        );
      const compounded = inflate(initialConverted, inflation, divisor, bn(1));
      (await hub.inflate(initialConverted, 1)).should.be.bignumber.equal(compounded);
    });

    it('returns the correct inflation with x periods passed', async () => {
      hub = await Hub
        .new(
          systemOwner,
          inflation,
          period,
          symbol,
          initialConverted,
          initialConverted,
          timeout,
          { from: systemOwner, gas: maxGas },
        );
      const compounded = inflate(initialConverted, inflation, divisor, bn(22));
      (await hub.inflate(initialConverted, 22)).should.be.bignumber.equal(compounded);
    });

    it('returns the correct inflation with no periods passed', async () => {
      const startingRate = bn(52);
      inflation = bn(1035);
      hub = await Hub
        .new(
          systemOwner,
          inflation,
          period,
          symbol,
          initialConverted,
          startingRate,
          timeout,
          { from: systemOwner, gas: maxGas },
        );
      (await hub.inflate(startingRate, 0)).should.be.bignumber.equal(startingRate);
    });

    it('returns the correct inflation with 1 period passed', async () => {
      const startingRate = bn(2);
      inflation = bn(2035);
      hub = await Hub
        .new(
          systemOwner,
          inflation,
          period,
          symbol,
          initialConverted,
          startingRate,
          timeout,
          { from: systemOwner, gas: maxGas },
        );
      const compounded = inflate(startingRate, inflation, bn(1000), bn(1));
      (await hub.inflate(startingRate, 1)).should.be.bignumber.equal(compounded);
    });

    it('returns the correct inflation with x periods passed', async () => {
      const startingRate = bn(4562);
      inflation = bn(705);
      hub = await Hub
        .new(
          systemOwner,
          inflation,
          period,
          symbol,
          initialConverted,
          startingRate,
          timeout,
          { from: systemOwner, gas: maxGas },
        );
      const compounded = inflate(startingRate, inflation, bn(100), bn(22));
      (await hub.inflate(startingRate, 22)).should.be.bignumber.equal(compounded);
    });
  });

  describe('finds correct divisor', () => {
    it('returns the correct divisor for 6790007', async () => {
      inflation = bn(6790007);
      hub = await Hub
        .new(
          systemOwner,
          inflation,
          period,
          symbol,
          initialConverted,
          initialConverted,
          timeout,
          { from: systemOwner, gas: maxGas },
        );
      (await hub.divisor()).should.be.bignumber.equal(bn(1000000));
    });

    it('returns the correct divisor for 7', async () => {
      inflation = bn(7);
      hub = await Hub
        .new(
          systemOwner,
          inflation,
          period,
          symbol,
          initialConverted,
          initialConverted,
          timeout,
          { from: systemOwner, gas: maxGas },
        );
      (await hub.divisor()).should.be.bignumber.equal(bn(1));
    });

    it('returns the correct divisor for 10', async () => {
      inflation = bn(10);
      hub = await Hub
        .new(
          systemOwner,
          inflation,
          period,
          symbol,
          initialConverted,
          initialConverted,
          timeout,
          { from: systemOwner, gas: maxGas },
        );
      (await hub.divisor()).should.be.bignumber.equal(bn(10));
    });

    it('returns the correct divisor for 0', async () => {
      inflation = bn(0);
      hub = await Hub
        .new(
          systemOwner,
          inflation,
          period,
          symbol,
          initialConverted,
          initialConverted,
          timeout,
          { from: systemOwner, gas: maxGas },
        );
      (await hub.divisor()).should.be.bignumber.equal(bn(1));
    });

    it('returns the correct divisor for 10000', async () => {
      inflation = bn(10000);
      hub = await Hub
        .new(
          systemOwner,
          inflation,
          period,
          symbol,
          initialConverted,
          initialConverted,
          timeout,
          { from: systemOwner, gas: maxGas },
        );
      (await hub.divisor()).should.be.bignumber.equal(bn(10000));
    });
  });
});

