const BigNumber = web3.BigNumber;
const { assertRevert } = require('./helpers/assertRevert');
const { latestTime } = require('./helpers/latestTime');
const { increaseTimeTo, duration } = require('./helpers/increaseTime');
const Person = artifacts.require('Person');
const PersonFactory = artifacts.require('PersonFactory');
const TimeIssuedToken = artifacts.require('TimeIssuedToken');

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

const solc = require('solc');

const user = async (address, name, symbol) => {
  factory = await PersonFactory.deployed();
  out = {};

  out.address = address;
  out.personAddress = await factory.build.call({from: address})
  out.result = await factory.build({from: address});
  out.person = await Person.at(out.personAddress);
  out.token = await TimeIssuedToken.new(
    out.person.address,
    1,
    name,
    symbol,
    18,
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

      let scriptSrc = `
                    pragma solidity ^0.4.24;
                    contract ERC20 {
                      function approve(address, uint256) returns (bool);
                    }
                    contract Person {
                      function exchangeTransfer( address _offeredToken
                                               , address _desiredToken
                                               , address _source
                                               , address _destination
                                               , uint256 _value )
                                               returns (bool);
                    }
                    contract Script {
                      function execute() public {
                        require(
                          ERC20(${alice.token.address}).approve(
                            ${bob.person.address},
                            10),
                          "Approve failed"
                        );
                        require(
                          Person(${bob.person.address}).exchangeTransfer(
                            ${alice.token.address},
                            ${bob.token.address},
                            ${alice.person.address},
                            ${carol.person.address},
                            10),
                          "ExchnageTransfer failed"
                        );
                      }
                    }
                  `;

      let compiled = solc.compile(scriptSrc);
      let bytecode = compiled.contracts[':Script'].bytecode;

      let code = "0x" + bytecode;
      let data = "0x61461954";

      await alice.person.execute( code, data, { from: alice.address });

      (await alice.token.balanceOf(
        bob.person.address
      )).should.be.bignumber.equal(10);

      (await bob.token.balanceOf(
        carol.person.address
      )).should.be.bignumber.equal(10);

    });
  });
});
