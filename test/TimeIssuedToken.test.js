const { latestTime } = require('./helpers/latestTime');
const { increaseTimeTo, duration } = require('./helpers/increaseTime');

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

const TimeIssuedToken = artifacts.require('TimeIssuedToken');

contract('TimeIssuedToken', function ([_, person, another]) {
  const rate = 2;

  context('with token', function () {
    beforeEach(async function () {
      this.token = await TimeIssuedToken.new(person, rate, "_", "_", 0);
    });

    describe('at creation', function () {
      it('balances start at 0', async function () {
        (await this.token.balanceOf(person)).should.be.bignumber.equal(0);
        (await this.token.totalSupply()).should.be.bignumber.equal(0);
      });
    });

    context('when time increases one week', function () {
      beforeEach(async function() {
        await increaseTimeTo( (await latestTime()) + duration.weeks(1));
      });

      it('currency issued at `rate`', async function () {
        (await this.token.totalSupply()).should.be.bignumber.equal(duration.weeks(1)*rate);
        (await this.token.balanceOf(person)).should.be.bignumber.equal(duration.weeks(1)*rate);
        (await this.token.balanceOf(another)).should.be.bignumber.equal(0);
      });
    });
  });
});
