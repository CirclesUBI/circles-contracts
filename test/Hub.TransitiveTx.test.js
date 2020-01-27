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

contract('Hub', ([_, systemOwner, attacker, safeOwner, normalUser, thirdUser, fourthUser]) => { // eslint-disable-line no-unused-vars
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

  describe('user can transact transitively when there is a valid path', async () => {
    describe('when each user is sending their own token and path is valid', async () => {
      const trustLimit = 50;

      beforeEach(async () => {
        await hub.signup(tokenName, { from: safeOwner });
        await hub.signup(tokenName, { from: normalUser });
        await hub.signup(tokenName, { from: thirdUser });
        await hub.trust(safeOwner, trustLimit, { from: normalUser });
        await hub.trust(normalUser, trustLimit, { from: thirdUser });
        const amount = bn(25);
        await hub
          .transferThrough(
            [safeOwner, normalUser],
            [safeOwner, normalUser],
            [normalUser, thirdUser],
            [amount, amount],
            { from: safeOwner, gas });
      });

      it('deducts senders balance of own token', async () => {
        const tokenAddress = await hub.userToToken(safeOwner);
        const token = await Token.at(tokenAddress);
        const bal = await token.balanceOf(safeOwner);
        bal.should.be.bignumber.equal(bn(75));
      });

      it('sends senders token to first user', async () => {
        const tokenAddress = await hub.userToToken(safeOwner);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(normalUser))
          .should.be.bignumber.equal(bn(25));
      });

      it('deducts first users balance', async () => {
        const tokenAddress = await hub.userToToken(normalUser);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(normalUser))
          .should.be.bignumber.equal(bn(75));
      });

      it('sends first users token to destination', async () => {
        const tokenAddress = await hub.userToToken(normalUser);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(thirdUser))
          .should.be.bignumber.equal(bn(25));
      });

      it('sends first users token to destination', async () => {
        const tokenAddress = await hub.userToToken(normalUser);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(thirdUser))
          .should.be.bignumber.equal(bn(25));
      });

      it('cleans up the seen array', async () => {
        const seen = await hub.getSeen();
        seen.should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for safeOwner', async () => {
        const validation = await hub.getValidation(safeOwner);
        validation['0'].should.be.equal(ZERO_ADDRESS);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for normalUser', async () => {
        const validation = await hub.getValidation(normalUser);
        validation['0'].should.be.equal(ZERO_ADDRESS);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for thirdUser', async () => {
        const validation = await hub.getValidation(thirdUser);
        validation['0'].should.be.equal(ZERO_ADDRESS);
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
        await hub.signup(tokenName, { from: safeOwner });
        await hub.signup(tokenName, { from: normalUser });
        await hub.signup(tokenName, { from: thirdUser });
        await hub.signup(tokenName, { from: fourthUser });
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
            { from: safeOwner, gas });
      });

      it('deducts senders balance of own token', async () => {
        const tokenAddress = await hub.userToToken(safeOwner);
        const token = await Token.at(tokenAddress);
        const bal = await token.balanceOf(safeOwner);
        bal.should.be.bignumber.equal(bn(75));
      });

      it('sends senders token to first user', async () => {
        const tokenAddress = await hub.userToToken(safeOwner);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(normalUser))
          .should.be.bignumber.equal(bn(15));
      });

      it('deducts first users balance', async () => {
        const tokenAddress = await hub.userToToken(normalUser);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(normalUser)).should.be.bignumber.equal(bn(85));
      });

      it('sends first users token to destination', async () => {
        const tokenAddress = await hub.userToToken(normalUser);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(thirdUser))
          .should.be.bignumber.equal(bn(15));
      });

      it('sends senders token to fourth user', async () => {
        const tokenAddress = await hub.userToToken(safeOwner);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(fourthUser))
          .should.be.bignumber.equal(bn(10));
      });

      it('deducts fourth users balance', async () => {
        const tokenAddress = await hub.userToToken(fourthUser);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(fourthUser))
          .should.be.bignumber.equal(bn(90));
      });

      it('sends fourth users token to destination', async () => {
        const tokenAddress = await hub.userToToken(fourthUser);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(thirdUser))
          .should.be.bignumber.equal(bn(10));
      });

      it('cleans up the seen array', async () => {
        const seen = await hub.getSeen();
        seen.should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for safeOwner', async () => {
        const validation = await hub.getValidation(safeOwner);
        validation['0'].should.be.equal(ZERO_ADDRESS);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for normalUser', async () => {
        const validation = await hub.getValidation(normalUser);
        validation['0'].should.be.equal(ZERO_ADDRESS);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for thirdUser', async () => {
        const validation = await hub.getValidation(thirdUser);
        validation['0'].should.be.equal(ZERO_ADDRESS);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for fourthUser', async () => {
        const validation = await hub.getValidation(fourthUser);
        validation['0'].should.be.equal(ZERO_ADDRESS);
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
        await hub.signup(tokenName, { from: safeOwner });
        await hub.signup(tokenName, { from: normalUser });
        await hub.signup(tokenName, { from: thirdUser });
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
            { from: safeOwner, gas }));
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
            { from: safeOwner, gas }));
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
            { from: safeOwner, gas }));
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
            { from: safeOwner, gas }));
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
            { from: safeOwner, gas }));
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
            { from: safeOwner, gas }));
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
            { from: safeOwner, gas }));
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
            { from: safeOwner, gas }));
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
            { from: safeOwner, gas }));
      });
    });

    describe('when each user is not necessarily sending their own token and path is valid', async () => {
      const trustLimit = 50;

      beforeEach(async () => {
        await hub.signup(tokenName, { from: safeOwner });
        await hub.signup(tokenName, { from: normalUser });
        await hub.signup(tokenName, { from: thirdUser });
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
            { from: safeOwner, gas });
      });

      it('correctly set senders balance', async () => {
        const tokenAddress = await hub.userToToken(safeOwner);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(safeOwner))
          .should.be.bignumber.equal(bn(100));
      });

      it('sender has all their tokens back', async () => {
        const tokenAddress = await hub.userToToken(safeOwner);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(normalUser))
          .should.be.bignumber.equal(bn(0));
      });

      it('correctly sets normalUsers balance', async () => {
        const tokenAddress = await hub.userToToken(normalUser);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(normalUser))
          .should.be.bignumber.equal(bn(100));
      });

      it('normalUser has all their own tokens', async () => {
        const tokenAddress = await hub.userToToken(normalUser);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(safeOwner))
          .should.be.bignumber.equal(bn(0));
      });

      it('cleans up the seen array', async () => {
        const seen = await hub.getSeen();
        seen.should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for safeOwner', async () => {
        const validation = await hub.getValidation(safeOwner);
        validation['0'].should.be.equal(ZERO_ADDRESS);
        validation['1'].should.be.bignumber.equal(bn(0));
        validation['2'].should.be.bignumber.equal(bn(0));
      });

      it('cleans up the validation mapping for normalUser', async () => {
        const validation = await hub.getValidation(normalUser);
        validation['0'].should.be.equal(ZERO_ADDRESS);
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
  });
});
