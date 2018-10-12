const BigNumber = web3.BigNumber;
const { assertRevert } = require('./helpers/assertRevert');
const { latestTime } = require('./helpers/latestTime');
const { increaseTimeTo, duration } = require('./helpers/increaseTime');
const Person = artifacts.require('Person');

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

const user = async (address, name, symbol) => {
  out = {};

  out.address = address;
  out.person = await Person.new(name, symbol);

  return out;
};

contract('Person', accounts => {
  let alice = {};
  let bob = {};
  let carol = {};

  before(async () => {
    alice = await user(accounts[0], 'alice', 'ALC');
    bob = await user(accounts[1], 'bob', 'BOB');
    carol = await user(accounts[2], 'carol', 'CRL');

    // everyone is rich :)
    await increaseTimeTo((await latestTime()) + duration.days(1));
  });

  describe('trust/untrust', () => {
    it('revert if called by non owner', async () => {
      assertRevert(
        alice.person.trust(bob.person.address, {
          from: bob.address
        })
      );

      assertRevert(
        alice.person.untrust(bob.person.address, {
          from: bob.address
        })
      );
    });

    it('update the trusted mapping', async () => {
      const trusted = async () =>
        await alice.person.trusted(bob.person.address);

      (await trusted()).should.equal(false);

      await alice.person.trust(bob.person.address, {
        from: alice.address
      });
      (await trusted()).should.equal(true);

      await alice.person.untrust(bob.person.address, {
        from: alice.address
      });
      (await trusted()).should.equal(false);
    });
  });

  describe('exchangeTransfer', () => {
    it('can spend one hop through the trust graph', async () => {
      // A -> B -> C
      // TODO: Actual code doing this would package all of these transactions
      //  Into a script contract, so that they execute atomically.
      //  Right now when alice gives bob's exchange permission to withdraw,
      //  Anyone can race to swap her tokens

      // Bob Trusts Alice
      await bob.person.trust(alice.person.address, {
        from: bob.address
      });

      // Alice transfers 10 Circles to Carol through Bob
      await alice.person.exchangeTransfer(
        [carol.person.address, bob.person.address],
        web3.toWei(10),
        { from: alice.address }
      );
    });
  });
});
