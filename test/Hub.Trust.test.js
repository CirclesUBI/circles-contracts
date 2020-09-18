const truffleContract = require('@truffle/contract');
const { assertRevert } = require('./helpers/assertRevert');
const expectEvent = require('./helpers/expectEvent');
const safeArtifacts = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const proxyArtifacts = require('@circles/safe-contracts/build/contracts/ProxyFactory.json');
const {
  BigNumber,
  extraGas,
  maxGas,
  inflation,
  period,
  symbol,
  initialPayout,
  ZERO_ADDRESS,
  timeout,
} = require('./helpers/constants');
const { bn } = require('./helpers/math');
const { increase } = require('./helpers/increaseTime');
const { createSafeWithProxy } = require('./helpers/createSafeWithProxy');

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

const Hub = artifacts.require('MockHub');
const Token = artifacts.require('Token');
const GnosisSafe = truffleContract(safeArtifacts);
const ProxyFactory = truffleContract(proxyArtifacts);

GnosisSafe.setProvider(web3.currentProvider);
ProxyFactory.setProvider(web3.currentProvider);

contract('Hub - trust limits', ([_, systemOwner, attacker, safeOwner, normalUser, thirdUser, fourthUser, organization]) => { // eslint-disable-line no-unused-vars
  let hub = null;
  let safe = null;
  let proxyFactory = null;
  let userSafe = null;

  beforeEach(async () => {
    hub = await Hub
      .new(
        systemOwner,
        inflation,
        period,
        symbol,
        initialPayout,
        initialPayout,
        timeout,
        { from: systemOwner, gas: maxGas },
      );
    safe = await GnosisSafe.new({ from: systemOwner });
    proxyFactory = await ProxyFactory.new({ from: systemOwner });
    userSafe = await createSafeWithProxy(proxyFactory, safe, GnosisSafe, safeOwner);
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
        await hub.signup({ from: safeOwner });
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

    describe('when trust destination is not a circles token or organization', async () => {
      beforeEach(async () => {
        await hub.signup({ from: safeOwner });
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
        (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
          .should.be.bignumber.equal(new BigNumber(0));
      });
    });

    describe('when trust destination is an organization', async () => {
      beforeEach(async () => {
        await hub.signup({ from: safeOwner });
        await hub.organizationSignup({ from: organization });
      });

      it('throws when trusting organization', async () => {
        await assertRevert(hub.trust(organization, trustLimit, { from: safeOwner }));
      });

      it('creates a trust event when organization trust user', async () => {
        await hub.trust(safeOwner, trustLimit, { from: organization });
        const logs = await hub.getPastEvents('Trust', { fromBlock: 0, toBlock: 'latest' });

        const event = expectEvent.inLogs(logs, 'Trust', {
          canSendTo: organization,
          user: safeOwner,
        });

        return event.args.limit.should.be.bignumber.equal(new BigNumber(trustLimit));
      });

      it('correctly sets the trust limit', async () => {
        await hub.trust(safeOwner, trustLimit, { from: organization });
        (await hub.limits(organization, safeOwner))
          .should.be.bignumber.equal(new BigNumber(trustLimit));
      });

      it('checkSendLimit returns correct amount', async () => {
        await hub.trust(safeOwner, trustLimit, { from: organization });
        const tokenAddress = await hub.userToToken(safeOwner);
        const token = await Token.at(tokenAddress);
        const balance = await token.balanceOf(safeOwner);
        (await hub.checkSendLimit(safeOwner, safeOwner, organization))
          .should.be.bignumber.equal(new BigNumber(balance));
      });
    });

    describe('when trust destination is a circles token', async () => {
      beforeEach(async () => {
        await hub.signup({ from: safeOwner });
        await hub.signup({ from: normalUser });
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

      it('correctly sets the trust limit at 100', async () => {
        await hub.trust(normalUser, 100, { from: safeOwner });
        (await hub.limits(safeOwner, normalUser))
          .should.be.bignumber.equal(new BigNumber(100));
      });

      it('does not allow trust limit higher than 100', async () => {
        await assertRevert(hub.trust(normalUser, 101, { from: safeOwner }));
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
          await token.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
          const totalSupply = await token.totalSupply();
          const allowable = new BigNumber(totalSupply * (trustLimit / 100)).sub(amount);
          (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
            .should.be.bignumber.equal(allowable);
        });

        it('returns correct amount for returnable to sender, after tokens have been traded', async () => {
          const amount = bn(25);
          const tokenAddress = await hub.userToToken(normalUser);
          const token = await Token.at(tokenAddress);
          await token.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
          const balance = await token.balanceOf(safeOwner);
          (await hub.checkSendLimit(normalUser, safeOwner, normalUser))
            .should.be.bignumber.equal(balance);
        });

        it('returns correct amount when no tokens are tradeable', async () => {
          const amount = bn(50);
          const tokenAddress = await hub.userToToken(normalUser);
          const token = await Token.at(tokenAddress);
          await token.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
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
            await token.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
            const totalSupply = await token.totalSupply();
            const allowable = bn(totalSupply * (newTrustLimit / 100)).sub(amount);
            (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
              .should.be.bignumber.equal(allowable);
          });

          it('returns correct amount when no tokens are tradeable', async () => {
            const amount = bn(50);
            const tokenAddress = await hub.userToToken(normalUser);
            const token = await Token.at(tokenAddress);
            await token.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
            const totalSupply = await token.totalSupply();
            const allowable = bn(totalSupply * (newTrustLimit / 100)).sub(amount);
            (await hub
              .checkSendLimit(normalUser, normalUser, safeOwner))
              .should.be.bignumber.equal(allowable);
          });
        });

        describe('user can update trust limits to 100', async () => {
          const newTrustLimit = 100;
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
            await token.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
            const totalSupply = await token.totalSupply();
            const allowable = bn(totalSupply * (newTrustLimit / 100)).sub(amount);
            (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
              .should.be.bignumber.equal(allowable);
          });

          it('returns correct amount when no tokens are tradeable', async () => {
            const amount = bn(50);
            const tokenAddress = await hub.userToToken(normalUser);
            const token = await Token.at(tokenAddress);
            await token.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
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
      await hub.signup({ from: safeOwner });
      await hub.trust(normalUser, trustLimit, { from: safeOwner });
      const tokenAddress = await hub.userToToken(safeOwner);
      token = await Token.at(tokenAddress);
      await increase(period.toNumber());
      await token.update();
      await hub.signup({ from: normalUser });
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
        await token2.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
        (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
          .should.be.bignumber.equal(allowable);
      });

      it('returns correct amount when fewer tokens are tradeable', async () => {
        const safeOwnerTS = await token.totalSupply();
        const normalUserTS = await token2.totalSupply();
        const allowable = bn(safeOwnerTS * (trustLimit / 100)).sub(normalUserTS);
        await token2.transfer(safeOwner, normalUserTS, { from: normalUser, gas: extraGas });
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
        await token.transfer(normalUser, amount, { from: safeOwner, gas: extraGas });
        (await hub.checkSendLimit(safeOwner, safeOwner, normalUser))
          .should.be.bignumber.equal(allowable);
      });

      it('returns correct amount when no tokens are tradeable', async () => {
        const normalUserTS = await token2.totalSupply();
        const allowable = bn(normalUserTS * (trustLimit / 100));
        await token.transfer(normalUser, allowable, { from: safeOwner, gas: extraGas });
        (await hub
          .checkSendLimit(safeOwner, safeOwner, normalUser))
          .should.be.bignumber.equal(bn(0));
      });

      it('returns 0 when more tokens have been sent than the trust limit allows', async () => {
        const normalUserTS = await token2.totalSupply();
        await token.transfer(normalUser, normalUserTS, { from: safeOwner, gas: extraGas });
        (await hub
          .checkSendLimit(safeOwner, safeOwner, normalUser))
          .should.be.bignumber.equal(bn(0));
      });
    });
  });
});
