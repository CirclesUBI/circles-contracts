const BigNumber = web3.BigNumber;
const { assertRevert } = require('./helpers/assertRevert');
const { latestTime } = require('./helpers/latestTime');
const { increaseTimeTo, duration } = require('./helpers/increaseTime');
const Person = artifacts.require('Person');
const CirclesPersonFactory = artifacts.require('CirclesPersonFactory');
const TimeIssuedToken = artifacts.require('TimeIssuedToken');

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

const user = async (address, name, symbol) => {
  factory = await PersonFactory.deployed();
  out = {};

  const rate = 1;
  const decimals = 18;

  out.address = address;
  out.personAddress = await factory.build.call({ from: address });
  out.result = await factory.build({ from: address });
  out.person = await Person.at(out.personAddress);
  out.token = await TimeIssuedToken.new(
    out.person.address,
    rate,
    name,
    symbol,
    decimals,
    { from: address }
  );

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
    await increaseTimeTo((await latestTime()) + duration.years(10));
  });

  describe('trust', () => {
    it('reverts if called by non owner', async () => {
      assertRevert(
        alice.person.trust(bob.token.address, true, {
          from: bob.address
        })
      );
    });

    it('updates the trusted mapping', async () => {
      (await alice.person.trusted(bob.token.address)).should.equal(false);

      await alice.person.trust(bob.token.address, true, {
        from: alice.address
      });

      (await alice.person.trusted(bob.token.address)).should.equal(true);
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
      await bob.person.updateExchangeInput(alice.token.address, true, {
        from: bob.address
      });
      await bob.person.updateExchangeOutput(bob.token.address, true, {
        from: bob.address
      });

      // Alice allows B's exchange to withdraw her offered token
      // TODO: GGGGRRRR, execute is a delegate call, which is NOT
      //  what we want here. Gotta maybe upload this as a script..
      await alice.person.execute(
        alice.token.address,
        await alice.token.contract.approve.getData(
          bob.person.address,
          web3.toWei(10)
        ),
        { from: alice.address }
      );

      // Alice exhanges 10 Alice Token for Bob Token
      await alice.person.execute(
        bob.person.address,
        await bob.person.contract.exchangeTransfer.getData(
          alice.token.address,
          bob.token.address,
          alice.person.address,
          carol.person.address,
          web3.toWei(10)
        ),
        { from: alice.address }
      );
    });
  });
});
