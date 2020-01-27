const truffleContract = require('truffle-contract');
const { assertRevert } = require('./helpers/assertRevert');
const expectEvent = require('./helpers/expectEvent');
const safeArtifacts = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const { BigNumber, ZERO_ADDRESS } = require('./helpers/constants');
const { getTimestampFromTx } = require('./helpers/getTimestamp');
const { bn } = require('./helpers/math');

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

const Hub = artifacts.require('MockHub');
const Token = artifacts.require('Token');
const GnosisSafe = truffleContract(safeArtifacts);
GnosisSafe.setProvider(web3.currentProvider);

contract('Hub - trust limits', ([_, systemOwner, attacker, safeOwner, normalUser, thirdUser, fourthUser]) => { // eslint-disable-line no-unused-vars
  let hub = null;
  let safe = null;

  const inflation = bn(275);
  const period = bn(7885000000);
  const symbol = 'CRC';
  const initialPayout = bn(100);
  const tokenName = 'testToken';

  const gas = 6721975;

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, inflation, period, symbol, initialPayout, initialPayout);
    safe = await GnosisSafe.new({ from: systemOwner });
    await safe.setup([systemOwner], 1, ZERO_ADDRESS, '0x', ZERO_ADDRESS, 0, ZERO_ADDRESS, { from: systemOwner });
  });

  describe('user can set trust limits', async () => {
    const trustLimit = 50;

    describe('when user tries to adjust their trust for themselves', async () => {
      beforeEach(async () => {
        await hub.signup(tokenName, { from: safeOwner });
      });

      it('should throw', async () => assertRevert(hub.trust(safeOwner, trustLimit, { from: safeOwner })));

      it('correctly sets the trust limit on signup', async () => {
        (await hub.limits(safeOwner, safeOwner))
          .should.be.bignumber.equal(new BigNumber(100));
      });

      it('checkSendLimit returns the correct amount for an untrusted user', async () => {
        (await hub.checkSendLimit(safeOwner, safeOwner, safeOwner))
          .should.be.bignumber.equal(bn(100));
      });

      it('checkSendLimit returns the correct amount for self-send', async () => {
        (await hub.checkSendLimit(safeOwner, normalUser, safeOwner))
          .should.be.bignumber.equal(bn(0));
      });

      it('checkSendLimit returns the correct amount for token that isnt deployed', async () => {
        (await hub.checkSendLimit(ZERO_ADDRESS, safeOwner, safeOwner))
          .should.be.bignumber.equal(bn(0));
      });
    });

    describe('when trust destination is not a circles token', async () => {
      beforeEach(async () => {
        await hub.signup(tokenName, { from: safeOwner });
        await hub.trust(normalUser, trustLimit, { from: safeOwner });
      });

      it('creates a trust event', async () => {
        const logs = await hub.getPastEvents('Trust', { fromBlock: 0, toBlock: 'latest' });

        const event = expectEvent.inLogs(logs, 'Trust', {
          canSendTo: safeOwner,
          user: normalUser,
        });

        return event.args.limit.should.be.bignumber.equal(new BigNumber(trustLimit));
      });

      it('correctly sets the trust limit', async () => {
        (await hub.limits(safeOwner, normalUser))
          .should.be.bignumber.equal(new BigNumber(trustLimit));
      });
    });

    describe('when trust destination is a circles token', async () => {
      beforeEach(async () => {
        await hub.signup(tokenName, { from: safeOwner });
        await hub.signup(tokenName, { from: normalUser });
        await hub.trust(normalUser, trustLimit, { from: safeOwner });
      });

      it('creates a trust event', async () => {
        const logs = await hub.getPastEvents('Trust', { fromBlock: 0, toBlock: 'latest' });

        const event = expectEvent.inLogs(logs, 'Trust', {
          canSendTo: safeOwner,
          user: normalUser,
        });

        return event.args.limit.should.be.bignumber.equal(new BigNumber(trustLimit));
      });

      it('correctly sets the trust limit', async () => {
        (await hub.limits(safeOwner, normalUser))
          .should.be.bignumber.equal(new BigNumber(trustLimit));
      });

      describe('calculates the tradeable amount', async () => {
        it('returns correct amount when no tokens have been traded', async () => {
          const tokenAddress = await hub.userToToken(normalUser);
          const token = await Token.at(tokenAddress);
          const totalSupply = await token.totalSupply();
          const allowable = totalSupply * (trustLimit / 100);
          (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
            .should.be.bignumber.equal(new BigNumber(allowable));
        });

        it('returns correct amount when tokens have been traded', async () => {
          const amount = bn(25);
          const tokenAddress = await hub.userToToken(normalUser);
          const token = await Token.at(tokenAddress);
          await token.transfer(safeOwner, amount, { from: normalUser, gas });
          const totalSupply = await token.totalSupply();
          const allowable = new BigNumber(totalSupply * (trustLimit / 100)).sub(amount);
          (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
            .should.be.bignumber.equal(allowable);
        });

        it('returns correct amount for returnable to sender, after tokens have been traded', async () => {
          const amount = bn(25);
          const tokenAddress = await hub.userToToken(normalUser);
          const token = await Token.at(tokenAddress);
          await token.transfer(safeOwner, amount, { from: normalUser, gas });
          const balance = await token.balanceOf(safeOwner);
          (await hub.checkSendLimit(normalUser, safeOwner, normalUser))
            .should.be.bignumber.equal(balance);
        });

        it('returns correct amount when no tokens are tradeable', async () => {
          const amount = bn(50);
          const tokenAddress = await hub.userToToken(normalUser);
          const token = await Token.at(tokenAddress);
          await token.transfer(safeOwner, amount, { from: normalUser, gas });
          const totalSupply = await token.totalSupply();
          const allowable = new BigNumber(totalSupply * (trustLimit / 100)).sub(amount);
          (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
            .should.be.bignumber.equal(allowable);
        });

        it('returns correct amount when no tokens are returnable', async () => {
          (await hub.checkSendLimit(normalUser, safeOwner, normalUser))
            .should.be.bignumber.equal(bn(0));
        });

        it('returns correct amount when there is not trust connection', async () => {
          const amount = bn(0);
          (await hub.checkSendLimit(safeOwner, safeOwner, normalUser))
            .should.be.bignumber.equal(amount);
        });

        describe('user can update trust limits', async () => {
          const newTrustLimit = 75;
          let txHash;

          beforeEach(async () => {
            txHash = await hub.trust(normalUser, newTrustLimit, { from: safeOwner });
          });

          it('creates a trust event', async () => {
            const { logs } = txHash;

            const event = expectEvent.inLogs(logs, 'Trust', {
              canSendTo: safeOwner,
              user: normalUser,
            });

            return event.args.limit.should.be.bignumber.equal(bn(newTrustLimit));
          });

          it('correctly sets the trust limit', async () => {
            (await hub.limits(safeOwner, normalUser))
              .should.be.bignumber.equal(bn(newTrustLimit));
          });

          it('returns correct amount when no tokens have been traded', async () => {
            const tokenAddress = await hub.userToToken(normalUser);
            const token = await Token.at(tokenAddress);
            const totalSupply = await token.totalSupply();
            const allowable = totalSupply * (newTrustLimit / 100);
            (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
              .should.be.bignumber.equal(bn(allowable));
          });

          it('returns correct amount when tokens have been traded', async () => {
            const amount = bn(25);
            const tokenAddress = await hub.userToToken(normalUser);
            const token = await Token.at(tokenAddress);
            await token.transfer(safeOwner, amount, { from: normalUser, gas });
            const totalSupply = await token.totalSupply();
            const allowable = bn(totalSupply * (newTrustLimit / 100)).sub(amount);
            (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
              .should.be.bignumber.equal(allowable);
          });

          it('returns correct amount when no tokens are tradeable', async () => {
            const amount = bn(50);
            const tokenAddress = await hub.userToToken(normalUser);
            const token = await Token.at(tokenAddress);
            await token.transfer(safeOwner, amount, { from: normalUser, gas });
            const totalSupply = await token.totalSupply();
            const allowable = bn(totalSupply * (newTrustLimit / 100)).sub(amount);
            (await hub
              .checkSendLimit(normalUser, normalUser, safeOwner))
              .should.be.bignumber.equal(allowable);
          });
        });
      });
    });
  });
});
