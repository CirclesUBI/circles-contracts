const truffleContract = require('truffle-contract');
const { assertRevert } = require('./helpers/assertRevert');
const { executeSafeTx } = require('./helpers/executeSafeTx');
const expectEvent = require('./helpers/expectEvent');
const safeArtifacts = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const proxyArtifacts = require('@circles/safe-contracts/build/contracts/ProxyFactory.json');
const { BigNumber, ZERO_ADDRESS } = require('./helpers/constants');
const { getTimestamp } = require('./helpers/getTimestamp');
const { bn } = require('./helpers/math');

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

const Hub = artifacts.require('Hub');
const Token = artifacts.require('Token');
const GnosisSafe = truffleContract(safeArtifacts);
const ProxyFactory = truffleContract(proxyArtifacts);
GnosisSafe.setProvider(web3.currentProvider);
ProxyFactory.setProvider(web3.currentProvider);

contract('Hub', ([_, systemOwner, attacker, safeOwner, normalUser, thirdUser, fourthUser]) => { // eslint-disable-line no-unused-vars
  let hub = null;
  let safe = null;
  let proxyFactory = null;

  const inflation = bn(275);
  const divisor = bn(100);
  const period = bn(7885000000);
  const symbol = 'CRC';
  const initialPayout = bn(100);
  const tokenName = 'testToken';

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, inflation, divisor, period, symbol, initialPayout);
    safe = await GnosisSafe.new({ from: systemOwner });
    proxyFactory = await ProxyFactory.new({ from: systemOwner });
    await safe.setup([systemOwner], 1, ZERO_ADDRESS, '0x', ZERO_ADDRESS, 0, ZERO_ADDRESS, { from: systemOwner });
  });

  it('has the correct owner', async () => {
    (await hub.owner()).should.be.equal(systemOwner);
  });

  it('attacker cannot change owner', async () => {
    await assertRevert(hub.changeOwner(attacker, { from: attacker }));
  });

  it('has an inflation rate', async () => {
    (await hub.inflation()).should.be.bignumber.equal(inflation);
  });

  it('attacker cannot change inflation', async () => {
    await assertRevert(hub.updateInflation(42, { from: attacker }));
  });

  it('has a symbol', async () => {
    (await hub.symbol()).should.be.equal(symbol);
  });

  it('attacker cannot change symbol', async () => {
    await assertRevert(hub.updateSymbol('PLUM', { from: attacker }));
  });

  it('has the right deployed time', async () => {
    const timestamp = await getTimestamp(hub.transactionHash, web3);
    const deployed = await hub.deployedAt();
    (bn(timestamp)).should.be.bignumber.equal(deployed);
  });

  describe('owner can change system vars', async () => {
    after(async () => {
      await hub.updateInflation(inflation, { from: systemOwner });
      await hub.updateSymbol(symbol, { from: systemOwner });
    });


    it('owner can change inflation', async () => {
      await hub.updateInflation(1, { from: systemOwner });
      (await hub.inflation()).should.be.bignumber.equal(bn(1));
    });

    it('owner can change symbol', async () => {
      await hub.updateSymbol('PLUM', { from: systemOwner });
      (await hub.symbol()).should.be.equal('PLUM');
    });
  });

  describe('new user can signup, when user is an external account', async () => {
    beforeEach(async () => {
      await hub.signup(tokenName, { from: safeOwner });
    });

    it('signup emits an event with correct sender', async () => {
      const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest' });
      const event = expectEvent.inLogs(logs, 'Signup', {
        user: safeOwner,
      });

      return event.args.user.should.equal(safeOwner);
    });

    it('token is owned by correct sender', async () => {
      const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest' });

      const event = expectEvent.inLogs(logs, 'Signup', {
        user: safeOwner,
      });

      tokenAddress = event.args.token;
      token = await Token.at(tokenAddress);
      (await token.owner()).should.be.equal(safeOwner);
    });

    it('token has the correct name', async () => {
      const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest' });

      const event = expectEvent.inLogs(logs, 'Signup', {
        user: safeOwner,
      });

      tokenAddress = event.args.token;
      token = await Token.at(tokenAddress);
      (await token.name()).should.be.equal(tokenName);
    });

    it('throws if sender tries to sign up twice', async () => {
      await assertRevert(hub.signup(tokenName, { from: safeOwner }));
    });
  });

  describe('new user can signup, when user is a safe', async () => {
    beforeEach(async () => {
      const txParams = {
        to: hub.address,
        data: await hub.contract.methods.signup(tokenName).encodeABI(),
      };
      await executeSafeTx(safe, txParams, systemOwner, 6721975, systemOwner, web3);
    });

    it('signup emits an event with correct sender', async () => {
      const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest' });

      const event = expectEvent.inLogs(logs, 'Signup', {
        user: safe.address,
      });

      return event.args.user.should.equal(safe.address);
    });

    it('token is owned by correct sender', async () => {
      const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest' });

      const event = expectEvent.inLogs(logs, 'Signup', {
        user: safe.address,
      });

      tokenAddress = event.args.token;
      token = await Token.at(tokenAddress);
      (await token.owner()).should.be.equal(safe.address);
    });

    it('token has the correct name', async () => {
      const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest' });

      const event = expectEvent.inLogs(logs, 'Signup', {
        user: safe.address,
      });

      tokenAddress = event.args.token;
      token = await Token.at(tokenAddress);
      (await token.name()).should.be.equal(tokenName);
    });

    it('throws if sender tries to sign up twice', async () => {
      const txParams = {
        to: hub.address,
        data: await hub.contract.methods.signup(tokenName).encodeABI(),
      };
      await executeSafeTx(safe, txParams, systemOwner, 6721975, systemOwner, web3);

      const logs = await safe.getPastEvents('ExecutionFailed', { fromBlock: 0, toBlock: 'latest' });

      return expect(logs).to.have.lengthOf(1);
    });
  });

  describe('new user can signup, when user is a safe proxy', async () => {
    let userSafe = null;
    let token = null;

    beforeEach(async () => {
      const proxyData = safe.contract
        .methods.setup([safeOwner], 1, ZERO_ADDRESS, '0x', ZERO_ADDRESS, 0, ZERO_ADDRESS)
        .encodeABI();

      const tx = await proxyFactory
        .createProxy(safe.address, proxyData, { from: safeOwner, gas: 330000 });

      const { logs } = tx;

      const userSafeAddress = logs[0].args.proxy;

      userSafe = await GnosisSafe.at(userSafeAddress);

      const txParams = {
        to: hub.address,
        data: await hub.contract.methods.signup(tokenName).encodeABI(),
      };
      await executeSafeTx(userSafe, txParams, safeOwner, 6721975, safeOwner, web3);
    });

    it('signup emits an event with correct sender', async () => {
      const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest' });

      const event = expectEvent.inLogs(logs, 'Signup', {
        user: userSafe.address,
      });

      return event.args.user.should.equal(userSafe.address);
    });

    it('token is owned by correct sender', async () => {
      const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest' });

      const event = expectEvent.inLogs(logs, 'Signup', {
        user: userSafe.address,
      });

      tokenAddress = event.args.token;
      token = await Token.at(tokenAddress);

      (await token.owner()).should.be.equal(userSafe.address);
    });

    it('token has the correct name', async () => {
      const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest' });

      const event = expectEvent.inLogs(logs, 'Signup', {
        user: userSafe.address,
      });

      tokenAddress = event.args.token;
      token = await Token.at(tokenAddress);
      (await token.name()).should.be.equal(tokenName);
    });

    it('throws if sender tries to sign up twice', async () => {
      const txParams = {
        to: hub.address,
        data: await hub.contract.methods.signup(tokenName).encodeABI(),
      };
      await executeSafeTx(userSafe, txParams, safeOwner, 6721975, safeOwner, web3);

      const logs = await userSafe.getPastEvents('ExecutionFailed', { fromBlock: 0, toBlock: 'latest' });

      return expect(logs).to.have.lengthOf(1);
    });
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

      it('checkSendLimit returns the correct amount for self-send', async () => {
        (await hub.checkSendLimit(safeOwner, safeOwner, safeOwner))
          .should.be.bignumber.equal(bn(100));
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
          from: safeOwner,
          to: normalUser,
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
          from: safeOwner,
          to: normalUser,
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
          await token.transfer(safeOwner, amount, { from: normalUser });
          const totalSupply = await token.totalSupply();
          const allowable = new BigNumber(totalSupply * (trustLimit / 100)).sub(amount);
          (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
            .should.be.bignumber.equal(allowable);
        });

        it('returns correct amount for returnable to sender, after tokens have been traded', async () => {
          const amount = bn(25);
          const tokenAddress = await hub.userToToken(normalUser);
          const token = await Token.at(tokenAddress);
          await token.transfer(safeOwner, amount, { from: normalUser });
          const balance = await token.balanceOf(safeOwner);
          (await hub.checkSendLimit(normalUser, safeOwner, normalUser))
            .should.be.bignumber.equal(balance);
        });

        it('returns correct amount when no tokens are tradeable', async () => {
          const amount = bn(50);
          const tokenAddress = await hub.userToToken(normalUser);
          const token = await Token.at(tokenAddress);
          await token.transfer(safeOwner, amount, { from: normalUser });
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
              from: safeOwner,
              to: normalUser,
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
            await token.transfer(safeOwner, amount, { from: normalUser });
            const totalSupply = await token.totalSupply();
            const allowable = bn(totalSupply * (newTrustLimit / 100)).sub(amount);
            (await hub.checkSendLimit(normalUser, normalUser, safeOwner))
              .should.be.bignumber.equal(allowable);
          });

          it('returns correct amount when no tokens are tradeable', async () => {
            const amount = bn(50);
            const tokenAddress = await hub.userToToken(normalUser);
            const token = await Token.at(tokenAddress);
            await token.transfer(safeOwner, amount, { from: normalUser });
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
            { from: safeOwner, gas: 6721975 });
      });

      it('deducts senders balance of own token', async () => {
        const tokenAddress = await hub.userToToken(safeOwner);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(safeOwner))
          .should.be.bignumber.equal(bn(75));
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
            { from: safeOwner, gas: 6721975 });
      });

      it('deducts senders balance of own token', async () => {
        const tokenAddress = await hub.userToToken(safeOwner);
        const token = await Token.at(tokenAddress);
        (await token.balanceOf(safeOwner))
          .should.be.bignumber.equal(bn(75));
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
        (await token.balanceOf(normalUser))
          .should.be.bignumber.equal(bn(85));
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
            { from: safeOwner, gas: 6721975 }));
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
            { from: safeOwner, gas: 6721975 }));
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
            { from: safeOwner, gas: 6721975 }));
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
            { from: safeOwner, gas: 6721975 }));
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
            { from: safeOwner, gas: 6721975 }));
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
            { from: safeOwner, gas: 6721975 }));
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
            { from: safeOwner, gas: 6721975 }));
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
            { from: safeOwner, gas: 6721975 }));
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
            { from: safeOwner, gas: 6721975 }));
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
            { from: safeOwner, gas: 6721975 });
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
    });
  });
});
