const BigNumber = web3.BigNumber;
const { assertRevert } = require('./helpers/assertRevert');
const { latestTime } = require('./helpers/latestTime');
const { increaseTimeTo, duration } = require('./helpers/increaseTime');
const CirclesPerson = artifacts.require('CirclesPerson');
const TimeIssuedToken = artifacts.require('TimeIssuedToken');

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

const user = async (address, name, symbol) => {
  out = {};

  out.address = address;
  out.person = await CirclesPerson.new({ from: address });
  out.token = await TimeIssuedToken.new(
    out.person.address,
    1000,
    name,
    symbol,
    18,
    { from: address }
  );

  return out;
};

contract('CirclesPerson', accounts => {
  let alice = {};
  let bob = {};
  let carol = {};

  beforeEach(async () => {
    alice = await user(accounts[0], 'alice', 'ALC');
    bob = await user(accounts[1], 'bob', 'BOB');
    carol = await user(accounts[2], 'carol', 'CRL');

    // everyone is rich :)
    await increaseTimeTo((await latestTime()) + duration.years(1000));
  });

  describe('updateExchangeInput', () => {
    it('reverts if called by non owner', async () => {
      assertRevert(
        alice.person.updateExchangeInput(bob.token.address, true, {
          from: bob.address
        })
      );
    });

    it('updates isEligableExchangeInput mapping', async () => {
      (await alice.person.isEligableExchangeInput(
        bob.token.address
      )).should.equal(false);

      await alice.person.updateExchangeInput(bob.token.address, true, {
        from: alice.address
      });

      (await alice.person.isEligableExchangeInput(
        bob.token.address
      )).should.equal(true);
    });
  });

  describe('updateExchangeOutput', () => {
    it('updateExchangeOutput reverts if called by non owner', async () => {
      assertRevert(
        alice.person.updateExchangeOutput(bob.token.address, true, {
          from: bob.address
        })
      );
    });

    it('updates isEligableExchangeOutput mapping', async () => {
      (await alice.person.isEligableExchangeOutput(
        bob.token.address
      )).should.equal(false);

      await alice.person.updateExchangeOutput(bob.token.address, true, {
        from: alice.address
      });

      (await alice.person.isEligableExchangeOutput(
        bob.token.address
      )).should.equal(true);
    });
  });

  describe('isExchangeApproved', () => {
    const isApproved = async () => {
      return await alice.person.isExchangeApproved(
        bob.token.address,
        carol.token.address
      );
    };

    it('returns true when exchange is approved', async () => {
      (await isApproved()).should.equal(false);

      await alice.person.updateExchangeInput(bob.token.address, true, {
        from: alice.address
      });

      (await isApproved()).should.equal(false);

      await alice.person.updateExchangeOutput(carol.token.address, true, {
        from: alice.address
      });

      (await isApproved()).should.equal(true);
    });
  });

  describe('exchangeTransfer', () => {
    it('can spend one hop through the trust graph', async () => {
      await alice.token.approve(bob.person.address, web3.toWei(100), {
        from: bob.address
      });

      await bob.person.updateExchangeInput(alice.token.address, true, {
        from: bob.address
      });
      await bob.person.updateExchangeOutput(bob.token.address, true, {
        from: bob.address
      });

      await bob.person.exchangeApprove(
        alice.token.address,
        bob.token.address,
        carol.address,
        web3.toWei(100),
        { from: bob.address }
      );

      await bob.person.exchangeTransfer(
        alice.token.address,
        bob.token.address,
        carol.address,
        web3.toWei(10),
        { from: alice.address }
      );
    });
  });
});
