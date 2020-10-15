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
  name,
  signupBonus,
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
  const organizationTrustLimit = 100;
  let safeOwnerToken = null;
  let normalUserToken = null;

  beforeEach(async () => {
    hub = await Hub
      .new(
        inflation,
        period,
        symbol,
        name,
        signupBonus,
        signupBonus,
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
          .should.be.bignumber.equal(bn(100));
      });

      it('checkSendLimit returns the correct amount for self-send', async () => {
        (await hub.checkSendLimit(safeOwner, safeOwner, safeOwner))
          .should.be.bignumber.equal(bn(100));
      });

      it('checkSendLimit returns the correct amount for an untrusted user', async () => {
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

        return event.args.limit.should.be.bignumber.equal(bn(trustLimit));
      });

      it('correctly sets the trust limit', async () => {
        (await hub.limits(safeOwner, normalUser))
          .should.be.bignumber.equal(bn(trustLimit));
      });

      it('checkSendLimit returns correct amount', async () => {
        (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
          .should.be.bignumber.equal(bn(0));
      });
    });

    describe('when trust destination is an organization', async () => {
      beforeEach(async () => {
        await hub.signup({ from: safeOwner });
        const safeOwnerTokenAddress = await hub.userToToken(safeOwner);
        safeOwnerToken = await Token.at(safeOwnerTokenAddress);
        await hub.organizationSignup({ from: organization });
      });

      it('throws when trusting organization', async () => {
        await assertRevert(hub.trust(organization, trustLimit, { from: safeOwner }));
      });

      it('creates a trust event when organization trusts user', async () => {
        await hub.trust(safeOwner, organizationTrustLimit, { from: organization });
        const logs = await hub.getPastEvents('Trust', { fromBlock: 0, toBlock: 'latest' });

        const event = expectEvent.inLogs(logs, 'Trust', {
          canSendTo: organization,
          user: safeOwner,
        });

        return event.args.limit.should.be.bignumber.equal(bn(organizationTrustLimit));
      });

      it('correctly sets the trust limit', async () => {
        await hub.trust(safeOwner, organizationTrustLimit, { from: organization });
        (await hub.limits(organization, safeOwner))
          .should.be.bignumber.equal(bn(organizationTrustLimit));
      });

      it('checkSendLimit returns correct amount', async () => {
        await hub.trust(safeOwner, organizationTrustLimit, { from: organization });
        const balance = await safeOwnerToken.balanceOf(safeOwner);
        (await hub.checkSendLimit(safeOwner, safeOwner, organization))
          .should.be.bignumber.equal(bn(balance));
      });

      it('throws when organization uses weighted trust', async () => {
        await assertRevert(hub.trust(safeOwner, trustLimit, { from: organization }));
      });
    });

    describe('when trust destination is a circles token', async () => {
      beforeEach(async () => {
        await hub.signup({ from: safeOwner });
        const safeOwnerTokenAddress = await hub.userToToken(safeOwner);
        safeOwnerToken = await Token.at(safeOwnerTokenAddress);
        await hub.signup({ from: normalUser });
        const normalUserTokenAddress = await hub.userToToken(normalUser);
        normalUserToken = await Token.at(normalUserTokenAddress);
        await hub.trust(normalUser, trustLimit, { from: safeOwner });

      });

      it('creates a trust event', async () => {
        const logs = await hub.getPastEvents('Trust', { fromBlock: 0, toBlock: 'latest' });

        const event = expectEvent.inLogs(logs, 'Trust', {
          canSendTo: safeOwner,
          user: normalUser,
        });

        return event.args.limit.should.be.bignumber.equal(bn(trustLimit));
      });

      it('correctly sets the trust limit', async () => {
        (await hub.limits(safeOwner, normalUser))
          .should.be.bignumber.equal(bn(trustLimit));
      });

      it('correctly sets the trust limit at 100', async () => {
        await hub.trust(normalUser, 100, { from: safeOwner });
        (await hub.limits(safeOwner, normalUser))
          .should.be.bignumber.equal(bn(100));
      });

      it('does not allow trust limit higher than 100', async () => {
        await assertRevert(hub.trust(normalUser, 101, { from: safeOwner }));
      });

      describe('calculates the tradeable amount', async () => {
        it('returns correct amount when no tokens have been traded', async () => {
          const safeOwnerBalance = await safeOwnerToken.balanceOf(safeOwner);
          const allowable = safeOwnerBalance * (trustLimit / 100);
          (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
            .should.be.bignumber.equal(bn(allowable));
        });

        it('returns correct amount when truster receives tokens of the other user', async () => {
          const amount = bn(25);
          await normalUserToken.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
          const safeOwnerBalance = await safeOwnerToken.balanceOf(safeOwner);
          const safeOwnerBalanceOfNormalUserToken = await normalUserToken.balanceOf(safeOwner);
          const allowable = bn(safeOwnerBalance * (trustLimit / 100))
            .sub(bn(safeOwnerBalanceOfNormalUserToken * (1 - (trustLimit / 100))));
          (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
            .should.be.bignumber.equal(allowable);
        });

        it('returns correct amount for returnable to sender, after tokens have been traded', async () => {
          const amount = bn(25);
          await normalUserToken.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
          (await hub.checkSendLimit(normalUser, safeOwner, normalUser))
            .should.be.bignumber.equal(amount);
        });

        it('returns correct amount when no tokens are tradeable', async () => {
          const amount = bn(100);
          await normalUserToken.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
          (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
            .should.be.bignumber.equal(bn(0));
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
            const safeOwnerBalance = await safeOwnerToken.balanceOf(safeOwner);
            const allowable = safeOwnerBalance * (newTrustLimit / 100);
            (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
              .should.be.bignumber.equal(bn(allowable));
          });

          it('returns correct amount when user has received tokens', async () => {
            const amount = bn(25);
            await normalUserToken.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
            const safeOwnerBalance = await safeOwnerToken.balanceOf(safeOwner);
            const safeOwnerBalanceOfNormalUserToken = await normalUserToken.balanceOf(safeOwner);
            const allowable = bn(safeOwnerBalance * (newTrustLimit / 100))
              .sub(bn(safeOwnerBalanceOfNormalUserToken * (1 - (newTrustLimit / 100))));
            (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
              .should.be.bignumber.equal(allowable);
          });

          it('returns correct amount when user has sent tokens', async () => {
            const amount = bn(25);
            await safeOwnerToken.transfer(normalUser, amount, { from: safeOwner, gas: extraGas });
            const safeOwnerBalance = await safeOwnerToken.balanceOf(safeOwner);
            const allowable = bn(safeOwnerBalance * (newTrustLimit / 100));
            (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
              .should.be.bignumber.equal(allowable);
          });

          it('returns correct amount when no tokens are tradeable', async () => {
            const amount = bn(50);
            await normalUserToken.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
            await safeOwnerToken.transfer(thirdUser, amount, { from: safeOwner, gas: extraGas });
            (await hub
              .checkSendLimit(normalUser, normalUser, safeOwner))
              .should.be.bignumber.equal(bn(0));
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
            const safeOwnerBalance = await safeOwnerToken.balanceOf(safeOwner);
            const allowable = safeOwnerBalance * (newTrustLimit / 100);
            (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
              .should.be.bignumber.equal(bn(allowable));
          });

          it('returns correct amount when user has received tokens', async () => {
            const amount = bn(25);
            await normalUserToken.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
            const safeOwnerBalance = await safeOwnerToken.balanceOf(safeOwner);
            const safeOwnerBalanceOfNormalUserToken = await normalUserToken.balanceOf(safeOwner);
            const allowable = bn(safeOwnerBalance * (newTrustLimit / 100))
              .sub(bn(safeOwnerBalanceOfNormalUserToken * (1 - (newTrustLimit / 100))));
            (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
              .should.be.bignumber.equal(allowable);
          });

          it('returns correct amount when user has sent tokens', async () => {
            const amount = bn(25);
            await safeOwnerToken.transfer(normalUser, amount, { from: safeOwner, gas: extraGas });
            const safeOwnerBalance = await safeOwnerToken.balanceOf(safeOwner);
            const allowable = bn(safeOwnerBalance * (newTrustLimit / 100));
            (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
              .should.be.bignumber.equal(allowable);
          });

          it('should always accept tokens from someone trusted 100', async () => {
            const amount = bn(100);
            await normalUserToken.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
            (await hub
              .checkSendLimit(normalUser, normalUser, safeOwner))
              .should.be.bignumber.equal(bn(100));
          });
        });
      });
    });
  });

  describe('when users sign up at a different time', async () => {
    const trustLimit = 50;

    beforeEach(async () => {
      await hub.signup({ from: safeOwner });
      await hub.trust(normalUser, trustLimit, { from: safeOwner });
      const safeOwnertokenAddress = await hub.userToToken(safeOwner);
      safeOwnerToken = await Token.at(safeOwnertokenAddress);
      await increase(period.toNumber());
      await safeOwnerToken.update();
      await hub.signup({ from: normalUser });
      await hub.trust(safeOwner, trustLimit, { from: normalUser });
      const normalUserTokenAddress = await hub.userToToken(normalUser);
      normalUserToken = await Token.at(normalUserTokenAddress);
    });

    describe('from perspective of newer user', async () => {
      it('returns correct amount when no tokens have been traded', async () => {
        const safeOwnerBalance = await safeOwnerToken.balanceOf(safeOwner);
        const allowable = safeOwnerBalance * (trustLimit / 100);
        (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
          .should.be.bignumber.equal(bn(allowable));
      });

      it('returns correct amount when user has received tokens', async () => {
        const amount = bn(25);
        await normalUserToken.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
        const safeOwnerBalance = await safeOwnerToken.balanceOf(safeOwner);
        const safeOwnerBalanceOfNormalUserToken = await normalUserToken.balanceOf(safeOwner);
        const allowable = bn((safeOwnerBalance * trustLimit) / 100)
          .sub(bn((safeOwnerBalanceOfNormalUserToken * trustLimit) / 100));
        (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
          .should.be.bignumber.equal(allowable);
      });

      it('returns correct amount when user has sent tokens', async () => {
        const amount = bn(25);
        await safeOwnerToken.transfer(normalUser, amount, { from: safeOwner, gas: extraGas });
        const safeOwnerBalance = await safeOwnerToken.balanceOf(safeOwner);
        const allowable = bn(safeOwnerBalance * (trustLimit / 100));
        (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
          .should.be.bignumber.equal(allowable);
      });

      it('returns correct amount when ubi has been paid out', async () => {
        await increase(period.toNumber());
        await safeOwnerToken.update();
        const safeOwnerBalance = await safeOwnerToken.balanceOf(safeOwner);
        const allowable = bn(safeOwnerBalance * (trustLimit / 100));
        (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
          .should.be.bignumber.equal(allowable);
      });

      it('returns correct amount when ubi has been paid out to trust recipient', async () => {
        await increase(period.toNumber());
        await normalUserToken.update();
        const safeOwnerBalance = await safeOwnerToken.balanceOf(safeOwner);
        const allowable = bn(safeOwnerBalance * (trustLimit / 100));
        (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
          .should.be.bignumber.equal(allowable);
      });

      it('returns correct amount when fewer tokens are tradeable', async () => {
        const normalUserBalance = await normalUserToken.balanceOf(normalUser);
        await normalUserToken.transfer(
          safeOwner, normalUserBalance, { from: normalUser, gas: extraGas });
        const safeOwnerBalance = await safeOwnerToken.balanceOf(safeOwner);
        const safeOwnerBalanceOfNormalUserToken = await normalUserToken.balanceOf(safeOwner);
        const allowable = bn((safeOwnerBalance * trustLimit) / 100)
          .sub(bn((safeOwnerBalanceOfNormalUserToken * trustLimit) / 100));
        (await hub
          .checkSendLimit(normalUser, normalUser, safeOwner))
          .should.be.bignumber.equal(allowable);
      });
    });

    describe('from perspective of older user', async () => {
      it('returns correct amount when no tokens have been traded', async () => {
        const normalUserBalance = await normalUserToken.balanceOf(normalUser);
        const allowable = normalUserBalance * (trustLimit / 100);
        (await hub.checkSendLimit(safeOwner, safeOwner, normalUser))
          .should.be.bignumber.equal(bn(allowable));
      });

      it('returns correct amount when user has received tokens', async () => {
        const amount = bn(25);
        await safeOwnerToken.transfer(normalUser, amount, { from: safeOwner, gas: extraGas });
        const normalUserBalance = await normalUserToken.balanceOf(normalUser);
        const normalUserBalanceOfSafeOwnerToken = await safeOwnerToken.balanceOf(normalUser);
        const allowable = bn((normalUserBalance * trustLimit) / 100)
          .sub(bn((normalUserBalanceOfSafeOwnerToken * trustLimit) / 100));
        (await hub.checkSendLimit(safeOwner, safeOwner, normalUser))
          .should.be.bignumber.equal(allowable);
      });

      it('returns correct amount when user has sent tokens', async () => {
        const amount = bn(25);
        await normalUserToken.transfer(safeOwner, amount, { from: normalUser, gas: extraGas });
        const normalUserBalance = await normalUserToken.balanceOf(normalUser);
        const allowable = bn(normalUserBalance * (trustLimit / 100));
        (await hub.checkSendLimit(safeOwner, safeOwner, normalUser))
          .should.be.bignumber.equal(allowable);
      });

      it('returns correct amount when ubi has been paid out', async () => {
        await increase(period.toNumber());
        await normalUserToken.update();
        const normalUserBalance = await normalUserToken.balanceOf(normalUser);
        const allowable = bn(normalUserBalance * (trustLimit / 100));
        (await hub.checkSendLimit(safeOwner, safeOwner, normalUser))
          .should.be.bignumber.equal(allowable);
      });

      it('returns correct amount when ubi has been paid out to trust recipient', async () => {
        await increase(period.toNumber());
        await safeOwnerToken.update();
        const normalUserBalance = await normalUserToken.balanceOf(normalUser);
        const allowable = bn(normalUserBalance * (trustLimit / 100));
        (await hub.checkSendLimit(safeOwner, safeOwner, normalUser))
          .should.be.bignumber.equal(allowable);
      });

      it('returns correct amount when no tokens are tradeable', async () => {
        const normalUserBalance = await normalUserToken.balanceOf(normalUser);
        const allowable = bn(normalUserBalance * (trustLimit / 100));
        await safeOwnerToken.transfer(normalUser, allowable, { from: safeOwner, gas: extraGas });
        await normalUserToken.transfer(thirdUser, allowable, { from: normalUser, gas: extraGas });
        (await hub
          .checkSendLimit(safeOwner, safeOwner, normalUser))
          .should.be.bignumber.equal(bn(0));
      });

      it('returns 0 when more tokens have been sent than the trust limit allows', async () => {
        const normalUserBalance = await normalUserToken.balanceOf(normalUser);
        await safeOwnerToken.transfer(
          normalUser, normalUserBalance, { from: safeOwner, gas: extraGas });
        (await hub
          .checkSendLimit(safeOwner, safeOwner, normalUser))
          .should.be.bignumber.equal(bn(0));
      });
    });
  });
});
