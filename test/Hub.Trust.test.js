const truffleContract = require('truffle-contract');
const { assertRevert } = require('./helpers/assertRevert');
const expectEvent = require('./helpers/expectEvent');
const safeArtifacts = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const { BigNumber, ZERO_ADDRESS } = require('./helpers/constants');
const { bn } = require('./helpers/math');
const { increase } = require('./helpers/increaseTime');


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
    hub = await Hub.new(systemOwner, inflation, period, symbol, initialPayout, initialPayout,
      { from: systemOwner, gas: 0xfffffffffff });
    safe = await GnosisSafe.new({ from: systemOwner });
    await safe.setup([systemOwner], 1, ZERO_ADDRESS, '0x', ZERO_ADDRESS, 0, ZERO_ADDRESS, { from: systemOwner });
  });

  describe('user can set trust limits', async () => {
    const trustLimit = 50;

    describe('cannot trust someone before youve signed up', async () => {
      it('should throw', async () => assertRevert(hub.trust(normalUser, trustLimit, { from: safeOwner })));

      it('checkSendLimit should return zero', async () => {
        (await hub.checkSendLimit(safeOwner, safeOwner, normalUser))
          .should.be.bignumber.equal(bn(0));
      });
    });

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

      it('checkSendLimit returns correct amount', async () => {
        const tokenAddress = await hub.userToToken(safeOwner);
        const token = await Token.at(tokenAddress);
        const totalSupply = await token.totalSupply();
        const allowable = totalSupply * (trustLimit / 100);
        (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
          .should.be.bignumber.equal(new BigNumber(allowable));
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
          const tokenAddress = await hub.userToToken(safeOwner);
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

  describe('when users sign up at a different time', async () => {
    const trustLimit = 50;
    let token;
    let token2;

    beforeEach(async () => {
      await hub.signup(tokenName, { from: safeOwner });
      await hub.trust(normalUser, trustLimit, { from: safeOwner });
      const tokenAddress = await hub.userToToken(safeOwner);
      token = await Token.at(tokenAddress);
      await increase(period.toNumber());
      await token.update();
      await hub.signup(tokenName, { from: normalUser });
      await hub.trust(safeOwner, trustLimit, { from: normalUser });
      const token2Address = await hub.userToToken(normalUser);
      token2 = await Token.at(token2Address);
    });

    describe('from perspective of newer user', async () => {
      it('returns correct amount when no tokens have been traded', async () => {
        const safeOwnerTS = await token.totalSupply();
        const allowable = safeOwnerTS * (trustLimit / 100);
        (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
          .should.be.bignumber.equal(bn(allowable));
      });

      it('returns correct amount when tokens have been traded', async () => {
        const safeOwnerTS = await token.totalSupply();
        const amount = bn(25);
        const allowable = bn(safeOwnerTS * (trustLimit / 100)).sub(amount);
        await token2.transfer(safeOwner, amount, { from: normalUser, gas });
        (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
          .should.be.bignumber.equal(allowable);
      });

      it('returns correct amount when fewer tokens are tradeable', async () => {
        const safeOwnerTS = await token.totalSupply();
        const normalUserTS = await token2.totalSupply();
        const allowable = bn(safeOwnerTS * (trustLimit / 100)).sub(normalUserTS);
        await token2.transfer(safeOwner, normalUserTS, { from: normalUser, gas });
        (await hub
          .checkSendLimit(normalUser, normalUser, safeOwner))
          .should.be.bignumber.equal(allowable);
      });
    });

    describe('from perspective of older user', async () => {
      it('returns correct amount when no tokens have been traded', async () => {
        const totalSupply = await token2.totalSupply();
        const allowable = totalSupply * (trustLimit / 100);
        (await hub.checkSendLimit(safeOwner, safeOwner, normalUser))
          .should.be.bignumber.equal(bn(allowable));
      });

      it('returns correct amount when tokens have been traded', async () => {
        const normalUserTS = await token2.totalSupply();
        const amount = bn(25);
        const allowable = bn(normalUserTS * (trustLimit / 100)).sub(amount);
        await token.transfer(normalUser, amount, { from: safeOwner, gas });
        (await hub.checkSendLimit(safeOwner, safeOwner, normalUser))
          .should.be.bignumber.equal(allowable);
      });

      it('returns correct amount when no tokens are tradeable', async () => {
        const normalUserTS = await token2.totalSupply();
        const allowable = bn(normalUserTS * (trustLimit / 100));
        await token.transfer(normalUser, allowable, { from: safeOwner, gas });
        (await hub
          .checkSendLimit(safeOwner, safeOwner, normalUser))
          .should.be.bignumber.equal(bn(0));
      });

      it('returns 0 when more tokens have been sent than the trust limit allows', async () => {
        const normalUserTS = await token2.totalSupply();
        await token.transfer(normalUser, normalUserTS, { from: safeOwner, gas });
        (await hub
          .checkSendLimit(safeOwner, safeOwner, normalUser))
          .should.be.bignumber.equal(bn(0));
      });
    });
  });
});
