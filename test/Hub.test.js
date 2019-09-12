const truffleContract = require('truffle-contract');
const { assertRevert } = require('./helpers/assertRevert');
const { signTypedData } = require('./helpers/signTypedData');
const { formatTypedData } = require('./helpers/formatTypedData');
const expectEvent = require('./helpers/expectEvent');
const safeArtifacts = require('@gnosis.pm/safe-contracts/build/contracts/GnosisSafe.json');
const proxyArtifacts = require('@gnosis.pm/safe-contracts/build/contracts/ProxyFactory.json');
const { BigNumber, ZERO_ADDRESS } = require('./helpers/constants');
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

contract('Hub', ([_, systemOwner, attacker, safeOwner, normalUser]) => { // eslint-disable-line no-unused-vars
  let hub = null;
  let safe = null;
  let proxyFactory = null;

  const issuance = bn(1736111111111111);
  const demurrage = bn(0);
  const symbol = 'CRC';
  const initialPayout = bn(100);
  const tokenName = 'testToken';

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, issuance, demurrage, symbol, initialPayout);
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

  it('has an issuance rate', async () => {
    (await hub.issuanceRate()).should.be.bignumber.equal(issuance);
  });

  it('attacker cannot change issuance', async () => {
    await assertRevert(hub.updateIssuance(42, { from: attacker }));
  });

  it('has a demurrage rate', async () => {
    (await hub.demurrageRate()).should.be.bignumber.equal(demurrage);
  });

  it('attacker cannot change demurrage', async () => {
    await assertRevert(hub.updateDemurrage(42, { from: attacker }));
  });

  it('has a symbol', async () => {
    (await hub.symbol()).should.be.equal(symbol);
  });

  it('attacker cannot change symbol', async () => {
    await assertRevert(hub.updateSymbol('PLUM', { from: attacker }));
  });

  describe('owner can change system vars', async () => {
    after(async () => {
      await hub.updateIssuance(issuance, { from: systemOwner });
      await hub.updateDemurrage(demurrage, { from: systemOwner });
      await hub.updateSymbol(symbol, { from: systemOwner });
    });


    it('owner can change issuance', async () => {
      await hub.updateIssuance(1, { from: systemOwner });
      (await hub.issuanceRate()).should.be.bignumber.equal(bn(1));
    });

    it('owner can change demurrage', async () => {
      await hub.updateDemurrage(1, { from: systemOwner });
      (await hub.demurrageRate()).should.be.bignumber.equal(bn(1));
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
      const to = hub.address;
      const value = 0;
      const data = await hub.contract.methods.signup(tokenName).encodeABI();
      const operation = 0;
      const safeTxGas = 0;
      const baseGas = 0;
      const gasPrice = 0;
      const gasToken = ZERO_ADDRESS;
      const refundReceiver = ZERO_ADDRESS;
      const nonce = (await safe.nonce()).toNumber();

      const typedData = formatTypedData(
        to, value, data, operation, safeTxGas, baseGas, gasPrice,
        gasToken, refundReceiver, nonce, safe.address);

      const signatureBytes = await signTypedData(systemOwner, typedData, web3);
      return safe.execTransaction(
        to, value, data, operation, safeTxGas, baseGas, gasPrice,
        gasToken, refundReceiver, signatureBytes,
        { from: systemOwner, gas: 6721975 });
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
      const to = hub.address;
      const value = 0;
      const data = await hub.contract.methods.signup(tokenName).encodeABI();
      const operation = 0;
      const safeTxGas = 0;
      const dataGas = 0;
      const gasPrice = 0;
      const gasToken = ZERO_ADDRESS;
      const refundReceiver = ZERO_ADDRESS;
      const nonce = (await safe.nonce()).toNumber();

      const typedData = formatTypedData(
        to, value, data, operation, safeTxGas, dataGas, gasPrice,
        gasToken, refundReceiver, nonce, safe.address);

      const signatureBytes = await signTypedData(systemOwner, typedData, web3);
      await safe.execTransaction(
        to, value, data, operation, safeTxGas, dataGas, gasPrice,
        gasToken, refundReceiver, signatureBytes,
        { from: systemOwner, gas: 6721975 });

      const logs = await safe.getPastEvents('ExecutionFailed', { fromBlock: 0, toBlock: 'latest' });

      return expect(logs).to.have.lengthOf(1);
    });
  });

  describe('new user can signup, when user is a safe proxy', async () => {
    let userSafe = null;
    let token = null;

    beforeEach(async () => {
      const to = hub.address;
      const value = 0;
      const data = await hub.contract.methods.signup(tokenName).encodeABI();
      const operation = 0;
      const safeTxGas = 0;
      const baseGas = 0;
      const gasPrice = 0;
      const gasToken = ZERO_ADDRESS;
      const refundReceiver = ZERO_ADDRESS;
      const nonce = (await safe.nonce()).toNumber();

      const proxyData = safe.contract
        .methods.setup([safeOwner], 1, ZERO_ADDRESS, '0x', ZERO_ADDRESS, 0, ZERO_ADDRESS)
        .encodeABI();

      const tx = await proxyFactory
        .createProxy(safe.address, proxyData, { from: safeOwner, gas: 330000 });

      const { logs } = tx;

      const userSafeAddress = logs[0].args.proxy;

      userSafe = await GnosisSafe.at(userSafeAddress);

      const typedData = formatTypedData(
        to, value, data, operation, safeTxGas, baseGas, gasPrice,
        gasToken, refundReceiver, nonce, userSafe.address);

      const signatureBytes = await signTypedData(safeOwner, typedData, web3);
      return userSafe.execTransaction(
        to, value, data, operation, safeTxGas, baseGas, gasPrice,
        gasToken, refundReceiver, signatureBytes,
        { from: safeOwner, gas: 6721975 });
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
      const to = hub.address;
      const value = 0;
      const data = await hub.contract.methods.signup(tokenName).encodeABI();
      const operation = 0;
      const safeTxGas = 0;
      const dataGas = 0;
      const gasPrice = 0;
      const gasToken = ZERO_ADDRESS;
      const refundReceiver = ZERO_ADDRESS;
      const nonce = (await userSafe.nonce()).toNumber();

      const typedData = formatTypedData(
        to, value, data, operation, safeTxGas, dataGas, gasPrice,
        gasToken, refundReceiver, nonce, userSafe.address);

      const signatureBytes = await signTypedData(safeOwner, typedData, web3);
      await userSafe.execTransaction(
        to, value, data, operation, safeTxGas, dataGas, gasPrice,
        gasToken, refundReceiver, signatureBytes,
        { from: safeOwner, gas: 6721975 });

      const logs = await userSafe.getPastEvents('ExecutionFailed', { fromBlock: 0, toBlock: 'latest' });

      return expect(logs).to.have.lengthOf(1);
    });
  });

  describe('user can set trust limits', async () => {
    const trustLimit = 50;

    describe('when trust destination is not a circles token', async () => {
      beforeEach(async () => {
        await hub.signup(tokenName, { from: safeOwner });
      });

      it('should throw', async () => assertRevert(hub.trust(normalUser, trustLimit)));
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
          const tokenAddress = await hub.userToToken(safeOwner);
          const token = await Token.at(tokenAddress);
          const totalSupply = await token.totalSupply();
          const allowable = totalSupply * (trustLimit / 100);
          (await hub.checkSendLimit(normalUser, safeOwner))
            .should.be.bignumber.equal(new BigNumber(allowable));
        });

        it('returns correct amount when tokens have been traded', async () => {
          const amount = bn(25);
          const tokenAddress = await hub.userToToken(safeOwner);
          const token = await Token.at(tokenAddress);
          await token.transfer(normalUser, amount, { from: safeOwner });
          const totalSupply = await token.totalSupply();
          const allowable = new BigNumber(totalSupply * (trustLimit / 100)).sub(amount);
          (await hub.checkSendLimit(normalUser, safeOwner))
            .should.be.bignumber.equal(allowable);
        });

        it('returns correct amount when no tokens are tradeable', async () => {
          const amount = bn(50);
          const tokenAddress = await hub.userToToken(safeOwner);
          const token = await Token.at(tokenAddress);
          await token.transfer(normalUser, amount, { from: safeOwner });
          const totalSupply = await token.totalSupply();
          const allowable = new BigNumber(totalSupply * (trustLimit / 100)).sub(amount);
          (await hub.checkSendLimit(normalUser, safeOwner))
            .should.be.bignumber.equal(allowable);
        });

        it('returns correct amount when there is not trust connection', async () => {
          const amount = bn(0);
          (await hub.checkSendLimit(safeOwner, normalUser))
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
            const tokenAddress = await hub.userToToken(safeOwner);
            const token = await Token.at(tokenAddress);
            const totalSupply = await token.totalSupply();
            const allowable = totalSupply * (newTrustLimit / 100);
            (await hub.checkSendLimit(normalUser, safeOwner))
              .should.be.bignumber.equal(bn(allowable));
          });

          it('returns correct amount when tokens have been traded', async () => {
            const amount = bn(25);
            const tokenAddress = await hub.userToToken(safeOwner);
            const token = await Token.at(tokenAddress);
            await token.transfer(normalUser, amount, { from: safeOwner });
            const totalSupply = await token.totalSupply();
            const allowable = bn(totalSupply * (newTrustLimit / 100)).sub(amount);
            (await hub.checkSendLimit(normalUser, safeOwner))
              .should.be.bignumber.equal(allowable);
          });

          it('returns correct amount when no tokens are tradeable', async () => {
            const amount = bn(50);
            const tokenAddress = await hub.userToToken(safeOwner);
            const token = await Token.at(tokenAddress);
            await token.transfer(normalUser, amount, { from: safeOwner });
            const totalSupply = await token.totalSupply();
            const allowable = bn(totalSupply * (newTrustLimit / 100)).sub(amount);
            (await hub.checkSendLimit(normalUser, safeOwner)).should.be.bignumber.equal(allowable);
          });
        });
      });
    });
  });
});
