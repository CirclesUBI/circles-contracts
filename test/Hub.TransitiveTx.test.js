const truffleContract = require('@truffle/contract');
const { assertRevert } = require('./helpers/assertRevert');
const expectEvent = require('./helpers/expectEvent');
const safeArtifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/GnosisSafe.sol/GnosisSafe.json');
const proxyArtifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json');
const {
  BigNumber,
  extraGas,
  maxGas,
  inflation,
  period,
  symbol,
  name,
  signupBonus,
  timeout,
} = require('./helpers/constants');
const { bn } = require('./helpers/math');
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

contract('Hub - transtive trust', ([_, systemOwner, attacker, safeOwner, normalUser, thirdUser, fourthUser, organization]) => { // eslint-disable-line no-unused-vars
  let hub = null;
  let safe = null;
  let proxyFactory = null;
  let userSafe = null;
  const organizationTrustLimit = 100;
  let safeOwnerToken = null;
  let normalUserToken = null;
  let fourthUserToken = null;

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

  describe('user can transact transitively when there is a valid path', async () => {
    describe('when each user is sending their own token and path is valid', async () => {
      const trustLimit = 50;

      beforeEach(async () => {
        await hub.signup({ from: safeOwner });
        await hub.signup({ from: normalUser });
        await hub.signup({ from: thirdUser });
        const safeOwnertokenAddress = await hub.userToToken(safeOwner);
        safeOwnerToken = await Token.at(safeOwnertokenAddress);
        const normalUsertokenAddress = await hub.userToToken(normalUser);
        normalUserToken = await Token.at(normalUsertokenAddress);
        await hub.trust(safeOwner, trustLimit, { from: normalUser });
        await hub.trust(normalUser, trustLimit, { from: thirdUser });
        const amount = bn(25);
        await hub
          .transferThrough(
            [safeOwner, normalUser],
            [safeOwner, normalUser],
            [normalUser, thirdUser],
            [amount, amount],
            { from: safeOwner, gas: extraGas });
      });

      it('deducts senders balance of own token', async () => {
        const bal = await safeOwnerToken.balanceOf(safeOwner);
        bal.should.be.bignumber.equal(bn(75));
      });

      it('sends senders token to first user', async () => {
        (await safeOwnerToken.balanceOf(normalUser))
          .should.be.bignumber.equal(bn(25));
      });

      it('deducts first users balance', async () => {
        (await normalUserToken.balanceOf(normalUser))
          .should.be.bignumber.equal(bn(75));
      });

      it('sends first users token to destination', async () => {
        (await normalUserToken.balanceOf(thirdUser))
          .should.be.bignumber.equal(bn(25));
      });

      it('cleans up the seen array', async () => {
        const seen = await hub.getSeen();
        seen.should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for safeOwner', async () => {
        const validation = await hub.getValidation(safeOwner);
        validation['0'].should.be.equal(false);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for normalUser', async () => {
        const validation = await hub.getValidation(normalUser);
        validation['0'].should.be.equal(false);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for thirdUser', async () => {
        const validation = await hub.getValidation(thirdUser);
        validation['0'].should.be.equal(false);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('creates a HubTransfer event', async () => {
        const logs = await hub.getPastEvents('HubTransfer', { fromBlock: 0, toBlock: 'latest' });

        const event = expectEvent.inLogs(logs, 'HubTransfer', {
          from: safeOwner,
          to: thirdUser,
        });

        return event.args.amount.should.be.bignumber.equal(bn(25));
      });
    });

    describe('when each user is sending their own token and path is valid but forks', async () => {
      const trustLimit = 50;

      beforeEach(async () => {
        await hub.signup({ from: safeOwner });
        await hub.signup({ from: normalUser });
        await hub.signup({ from: thirdUser });
        await hub.signup({ from: fourthUser });
        const safeOwnertokenAddress = await hub.userToToken(safeOwner);
        safeOwnerToken = await Token.at(safeOwnertokenAddress);
        const normalUsertokenAddress = await hub.userToToken(normalUser);
        normalUserToken = await Token.at(normalUsertokenAddress);
        const fourthUsertokenAddress = await hub.userToToken(fourthUser);
        fourthUserToken = await Token.at(fourthUsertokenAddress);
        await hub.trust(safeOwner, trustLimit, { from: normalUser });
        await hub.trust(safeOwner, trustLimit, { from: fourthUser });
        await hub.trust(normalUser, trustLimit, { from: thirdUser });
        await hub.trust(fourthUser, trustLimit, { from: thirdUser });
        await hub
          .transferThrough(
            [safeOwner, normalUser, fourthUser, safeOwner],
            [safeOwner, normalUser, fourthUser, safeOwner],
            [normalUser, thirdUser, thirdUser, fourthUser],
            [15, 15, 10, 10],
            { from: safeOwner, gas: extraGas });
      });

      it('deducts senders balance of own token', async () => {
        const bal = await safeOwnerToken.balanceOf(safeOwner);
        bal.should.be.bignumber.equal(bn(75));
      });

      it('sends senders token to first user', async () => {
        (await safeOwnerToken.balanceOf(normalUser))
          .should.be.bignumber.equal(bn(15));
      });

      it('deducts first users balance', async () => {
        (await normalUserToken.balanceOf(normalUser)).should.be.bignumber.equal(bn(85));
      });

      it('sends first users token to destination', async () => {
        (await normalUserToken.balanceOf(thirdUser))
          .should.be.bignumber.equal(bn(15));
      });

      it('sends senders token to fourth user', async () => {
        (await safeOwnerToken.balanceOf(fourthUser))
          .should.be.bignumber.equal(bn(10));
      });

      it('deducts fourth users balance', async () => {
        (await fourthUserToken.balanceOf(fourthUser))
          .should.be.bignumber.equal(bn(90));
      });

      it('sends fourth users token to destination', async () => {
        (await fourthUserToken.balanceOf(thirdUser))
          .should.be.bignumber.equal(bn(10));
      });

      it('cleans up the seen array', async () => {
        const seen = await hub.getSeen();
        seen.should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for safeOwner', async () => {
        const validation = await hub.getValidation(safeOwner);
        validation['0'].should.be.equal(false);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for normalUser', async () => {
        const validation = await hub.getValidation(normalUser);
        validation['0'].should.be.equal(false);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for thirdUser', async () => {
        const validation = await hub.getValidation(thirdUser);
        validation['0'].should.be.equal(false);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for fourthUser', async () => {
        const validation = await hub.getValidation(fourthUser);
        validation['0'].should.be.equal(false);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('creates a HubTransfer event', async () => {
        const logs = await hub.getPastEvents('HubTransfer', { fromBlock: 0, toBlock: 'latest' });

        const event = expectEvent.inLogs(logs, 'HubTransfer', {
          from: safeOwner,
          to: thirdUser,
        });

        return event.args.amount.should.be.bignumber.equal(bn(25));
      });
    });

    describe('when each user is sending their own token but trust path is invalid', async () => {
      const trustLimit = 50;

      beforeEach(async () => {
        await hub.signup({ from: safeOwner });
        await hub.signup({ from: normalUser });
        await hub.signup({ from: thirdUser });
        const safeOwnertokenAddress = await hub.userToToken(safeOwner);
        safeOwnerToken = await Token.at(safeOwnertokenAddress);
        await hub.trust(safeOwner, trustLimit, { from: normalUser });
      });

      it('should throw when missing trust', async () => {
        const amount = bn(25);
        await assertRevert(hub
          .transferThrough(
            [safeOwner, normalUser],
            [safeOwner, normalUser],
            [normalUser, thirdUser],
            [amount, amount],
            { from: safeOwner, gas: extraGas }));
      });

      it('should throw when trust limit is too low', async () => {
        await hub.trust(normalUser, 15, { from: thirdUser });
        const amount = bn(25);
        await assertRevert(hub
          .transferThrough(
            [safeOwner, normalUser],
            [safeOwner, normalUser],
            [normalUser, thirdUser],
            [amount, amount],
            { from: safeOwner, gas: extraGas }));
      });

      it('should throw when passed too many srcs', async () => {
        await hub.trust(normalUser, trustLimit, { from: thirdUser });
        const amount = bn(25);
        await assertRevert(hub
          .transferThrough(
            [safeOwner, normalUser],
            [safeOwner, normalUser, thirdUser],
            [normalUser, thirdUser],
            [amount, amount],
            { from: safeOwner, gas: extraGas }));
      });

      it('should throw when passed too many tokenOwners', async () => {
        await hub.trust(normalUser, trustLimit, { from: thirdUser });
        const amount = bn(25);
        await assertRevert(hub
          .transferThrough(
            [safeOwner, normalUser, thirdUser],
            [safeOwner, normalUser],
            [normalUser, thirdUser],
            [amount, amount],
            { from: safeOwner, gas: extraGas }));
      });

      it('should throw when passed too many dests', async () => {
        await hub.trust(normalUser, trustLimit, { from: thirdUser });
        const amount = bn(25);
        await assertRevert(hub
          .transferThrough(
            [safeOwner, normalUser],
            [safeOwner, normalUser],
            [normalUser, thirdUser, safeOwner],
            [amount, amount],
            { from: safeOwner, gas: extraGas }));
      });

      it('should throw when passed too many amounts', async () => {
        await hub.trust(normalUser, trustLimit, { from: thirdUser });
        const amount = bn(25);
        await assertRevert(hub
          .transferThrough(
            [safeOwner, normalUser],
            [safeOwner, normalUser],
            [normalUser, thirdUser],
            [amount, amount, amount],
            { from: safeOwner, gas: extraGas }));
      });

      it('should throw when sender is not sending enough', async () => {
        await hub.trust(normalUser, trustLimit, { from: thirdUser });
        const amount = bn(25);
        await assertRevert(hub
          .transferThrough(
            [safeOwner, normalUser],
            [safeOwner, normalUser],
            [normalUser, thirdUser],
            [15, amount],
            { from: safeOwner, gas: extraGas }));
      });

      it('should throw when sender is sending too much', async () => {
        await hub.trust(normalUser, trustLimit, { from: thirdUser });
        const amount = bn(25);
        await assertRevert(hub
          .transferThrough(
            [safeOwner, normalUser],
            [safeOwner, normalUser],
            [normalUser, thirdUser],
            [amount, 15],
            { from: safeOwner, gas: extraGas }));
      });

      it('should throw when sender is receiving', async () => {
        await hub.trust(normalUser, trustLimit, { from: safeOwner });
        const amount = bn(25);
        await assertRevert(hub
          .transferThrough(
            [safeOwner, normalUser],
            [safeOwner, normalUser],
            [normalUser, safeOwner],
            [amount, amount],
            { from: safeOwner, gas: extraGas }));
      });

      it('should be able to send max based on trust limit', async () => {
        const amount = await hub.checkSendLimit(safeOwner, safeOwner, normalUser);
        await hub
          .transferThrough(
            [safeOwner],
            [safeOwner],
            [normalUser],
            [amount],
            { from: safeOwner, gas: extraGas });
        (await safeOwnerToken.balanceOf(normalUser))
          .should.be.bignumber.equal(amount);
      });

      it('should throw when passing trust limit', async () => {
        const amount = await hub.checkSendLimit(safeOwner, safeOwner, normalUser);
        await assertRevert(hub
          .transferThrough(
            [safeOwner],
            [safeOwner],
            [normalUser],
            [amount.add(bn(1))],
            { from: safeOwner, gas: extraGas }));
      });
    });

    describe('when each user is not necessarily sending their own token and path is valid', async () => {
      const trustLimit = 50;

      beforeEach(async () => {
        await hub.signup({ from: safeOwner });
        await hub.signup({ from: normalUser });
        await hub.signup({ from: thirdUser });
        const safeOwnertokenAddress = await hub.userToToken(safeOwner);
        safeOwnerToken = await Token.at(safeOwnertokenAddress);
        const normalUsertokenAddress = await hub.userToToken(normalUser);
        normalUserToken = await Token.at(normalUsertokenAddress);
        await hub.trust(safeOwner, trustLimit, { from: normalUser });
        await hub.trust(normalUser, trustLimit, { from: safeOwner });
        await hub.trust(normalUser, trustLimit, { from: thirdUser });
        const amount = bn(25);
        const tokenAddress = await hub.userToToken(normalUser);
        const token = await Token.at(tokenAddress);
        await token.transfer(safeOwner, amount, { from: normalUser });
        await hub
          .transferThrough(
            [normalUser],
            [safeOwner],
            [normalUser],
            [amount],
            { from: safeOwner, gas: extraGas });
      });

      it('correctly set senders balance', async () => {
        (await safeOwnerToken.balanceOf(safeOwner))
          .should.be.bignumber.equal(bn(100));
      });

      it('sender has all their tokens back', async () => {
        (await safeOwnerToken.balanceOf(normalUser))
          .should.be.bignumber.equal(bn(0));
      });

      it('correctly sets normalUsers balance', async () => {
        (await normalUserToken.balanceOf(normalUser))
          .should.be.bignumber.equal(bn(100));
      });

      it('normalUser has all their own tokens', async () => {
        (await normalUserToken.balanceOf(safeOwner))
          .should.be.bignumber.equal(bn(0));
      });

      it('cleans up the seen array', async () => {
        const seen = await hub.getSeen();
        seen.should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for safeOwner', async () => {
        const validation = await hub.getValidation(safeOwner);
        validation['0'].should.be.equal(false);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for normalUser', async () => {
        const validation = await hub.getValidation(normalUser);
        validation['0'].should.be.equal(false);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('creates a HubTransfer event', async () => {
        const logs = await hub.getPastEvents('HubTransfer', { fromBlock: 0, toBlock: 'latest' });

        const event = expectEvent.inLogs(logs, 'HubTransfer', {
          from: safeOwner,
          to: normalUser,
        });

        return event.args.amount.should.be.bignumber.equal(bn(25));
      });
    });

    describe('when each final destination is an organization', async () => {
      const trustLimit = 50;

      beforeEach(async () => {
        await hub.signup({ from: safeOwner });
        await hub.signup({ from: normalUser });
        await hub.organizationSignup({ from: organization });
        await hub.trust(safeOwner, trustLimit, { from: normalUser });
        await hub.trust(normalUser, trustLimit, { from: safeOwner });
        await hub.trust(normalUser, organizationTrustLimit, { from: organization });
        const safeOwnertokenAddress = await hub.userToToken(safeOwner);
        safeOwnerToken = await Token.at(safeOwnertokenAddress);
        const normalUsertokenAddress = await hub.userToToken(normalUser);
        normalUserToken = await Token.at(normalUsertokenAddress);
        const amount = bn(25);
        await normalUserToken.transfer(safeOwner, amount, { from: normalUser });
        await hub
          .transferThrough(
            [normalUser],
            [safeOwner],
            [organization],
            [amount],
            { from: safeOwner, gas: extraGas });
      });

      it('correctly set senders balance', async () => {
        (await safeOwnerToken.balanceOf(safeOwner))
          .should.be.bignumber.equal(bn(100));
      });

      it('normalUser has no tokens back', async () => {
        (await safeOwnerToken.balanceOf(normalUser))
          .should.be.bignumber.equal(bn(0));
      });

      it('correctly sets normalUsers balance', async () => {
        (await normalUserToken.balanceOf(normalUser))
          .should.be.bignumber.equal(bn(75));
      });

      it('safeOwner has no tokens at normalUser tokens', async () => {
        (await normalUserToken.balanceOf(safeOwner))
          .should.be.bignumber.equal(bn(0));
      });

      it('organization has no safeOwner tokens', async () => {
        (await safeOwnerToken.balanceOf(organization))
          .should.be.bignumber.equal(bn(0));
      });

      it('organization has the correct balance of normalUser tokens', async () => {
        (await normalUserToken.balanceOf(organization))
          .should.be.bignumber.equal(bn(25));
      });

      it('cleans up the seen array', async () => {
        const seen = await hub.getSeen();
        seen.should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for safeOwner', async () => {
        const validation = await hub.getValidation(safeOwner);
        validation['0'].should.be.equal(false);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for normalUser', async () => {
        const validation = await hub.getValidation(normalUser);
        validation['0'].should.be.equal(false);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('creates a HubTransfer event', async () => {
        const logs = await hub.getPastEvents('HubTransfer', { fromBlock: 0, toBlock: 'latest' });

        const event = expectEvent.inLogs(logs, 'HubTransfer', {
          from: safeOwner,
          to: organization,
        });

        return event.args.amount.should.be.bignumber.equal(bn(25));
      });
    });

    describe('when sender is an organization', async () => {
      const trustLimit = 50;

      beforeEach(async () => {
        await hub.signup({ from: safeOwner });
        await hub.signup({ from: normalUser });
        await hub.organizationSignup({ from: organization });
        await hub.trust(safeOwner, trustLimit, { from: normalUser });
        await hub.trust(normalUser, trustLimit, { from: safeOwner });
        await hub.trust(normalUser, organizationTrustLimit, { from: organization });
        const safeOwnertokenAddress = await hub.userToToken(safeOwner);
        safeOwnerToken = await Token.at(safeOwnertokenAddress);
        const normalUsertokenAddress = await hub.userToToken(normalUser);
        normalUserToken = await Token.at(normalUsertokenAddress);
        const amount = bn(25);
        await normalUserToken.transfer(organization, amount, { from: normalUser });
        await hub
          .transferThrough(
            [normalUser],
            [organization],
            [safeOwner],
            [amount],
            { from: organization, gas: extraGas });
      });

      it('safeOwners tokens are not touched', async () => {
        (await safeOwnerToken.balanceOf(safeOwner))
          .should.be.bignumber.equal(bn(100));
      });

      it('correctly sets safeOwners balance of normalUsers token', async () => {
        (await normalUserToken.balanceOf(safeOwner))
          .should.be.bignumber.equal(bn(25));
      });

      it('normalUsers balance of own tokens are untouched', async () => {
        (await normalUserToken.balanceOf(normalUser))
          .should.be.bignumber.equal(bn(75));
      });

      it('normalUser has no tokens of safeOwner', async () => {
        (await safeOwnerToken.balanceOf(normalUser))
          .should.be.bignumber.equal(bn(0));
      });

      it('organization has no safeOwner tokens', async () => {
        (await safeOwnerToken.balanceOf(organization))
          .should.be.bignumber.equal(bn(0));
      });

      it('organization has no normalUser tokens', async () => {
        (await normalUserToken.balanceOf(organization))
          .should.be.bignumber.equal(bn(0));
      });

      it('cleans up the seen array', async () => {
        const seen = await hub.getSeen();
        seen.should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for safeOwner', async () => {
        const validation = await hub.getValidation(safeOwner);
        validation['0'].should.be.equal(false);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for normalUser', async () => {
        const validation = await hub.getValidation(normalUser);
        validation['0'].should.be.equal(false);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('creates a HubTransfer event', async () => {
        const logs = await hub.getPastEvents('HubTransfer', { fromBlock: 0, toBlock: 'latest' });

        const event = expectEvent.inLogs(logs, 'HubTransfer', {
          from: organization,
          to: safeOwner,
        });

        return event.args.amount.should.be.bignumber.equal(bn(25));
      });
    });
  });
});
