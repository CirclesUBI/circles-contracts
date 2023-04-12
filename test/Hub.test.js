const truffleContract = require('@truffle/contract');
const proxyArtifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json');
const safeArtifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/GnosisSafeL2.sol/GnosisSafeL2.json');
const { assertRevert } = require('./helpers/assertRevert');
const { executeSafeTx } = require('./helpers/executeSafeTx');
const expectEvent = require('./helpers/expectEvent');
const {
  BigNumber,
  extraGas,
  maxGas,
  inflation,
  period,
  symbol,
  name,
  signupBonus,
  initialIssuance,
  timeout,
} = require('./helpers/constants');
const { getTimestampFromTx } = require('./helpers/getTimestamp');
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

contract('Hub - signup', ([_, systemOwner, attacker, safeOwner, normalUser, thirdUser, fourthUser, organization]) => { // eslint-disable-line no-unused-vars
  let hub = null;
  let safe = null;
  let proxyFactory = null;
  let userSafe = null;

  beforeEach(async () => {
    hub = await Hub
      .new(
        inflation,
        period,
        symbol,
        name,
        signupBonus,
        initialIssuance,
        timeout,
        { from: systemOwner, gas: maxGas },
      );
    safe = await GnosisSafe.new({ from: systemOwner });
    proxyFactory = await ProxyFactory.new({ from: systemOwner });
    userSafe = await createSafeWithProxy(proxyFactory, safe, GnosisSafe, safeOwner);
  });

  it('has an inflation rate', async () => {
    (await hub.inflation()).should.be.bignumber.equal(inflation);
  });

  it('has an starting rate', async () => {
    (await hub.initialIssuance()).should.be.bignumber.equal(initialIssuance);
  });

  it('has a symbol', async () => {
    (await hub.symbol()).should.be.equal(symbol);
  });

  it('has a name', async () => {
    (await hub.name()).should.be.equal(name);
  });

  it('has the right deployed time', async () => {
    const timestamp = await getTimestampFromTx(hub.transactionHash, web3);
    const deployed = await hub.deployedAt();
    (bn(timestamp)).should.be.bignumber.equal(deployed);
  });

  describe('new user can signup, when user is an external account', async () => {
    beforeEach(async () => {
      await hub.signup({ from: safeOwner });
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

    it('throws if sender tries to sign up twice', async () => {
      await assertRevert(hub.signup({ from: safeOwner }));
    });

    it('throws if sender tries to sign up as an organization', async () => {
      await assertRevert(hub.organizationSignup({ from: safeOwner }));
    });
  });

  describe('new user can signup as an organization', async () => {
    beforeEach(async () => {
      await hub.organizationSignup({ from: organization });
    });

    it('signup emits an event with correct sender', async () => {
      const logs = await hub.getPastEvents('OrganizationSignup', { fromBlock: 0, toBlock: 'latest' });
      const event = expectEvent.inLogs(logs, 'OrganizationSignup');

      return event.args.organization.should.equal(organization);
    });

    it('throws if organization tries to sign up twice', async () => {
      await assertRevert(hub.organizationSignup({ from: organization }));
    });

    it('throws if organization tries to sign up as a token', async () => {
      await assertRevert(hub.signup({ from: organization }));
    });
  });

  describe('new user can signup, when user is a safe', async () => {
    beforeEach(async () => {
      userSafe = await createSafeWithProxy(proxyFactory, safe, GnosisSafe, safeOwner);
      const txParams = {
        to: hub.address,
        data: await hub.contract.methods.signup().encodeABI(),
      };
      await executeSafeTx(userSafe, txParams, safeOwner, 0, extraGas, safeOwner, web3);
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

    it('throws if sender tries to sign up twice', async () => {
      const txParams = {
        to: hub.address,
        data: await hub.contract.methods.signup().encodeABI(),
      };
      await executeSafeTx(userSafe, txParams, safeOwner, 0, extraGas, safeOwner, web3);

      const logs = await userSafe.getPastEvents('ExecutionFailure', { fromBlock: 0, toBlock: 'latest' });

      return expect(logs).to.have.lengthOf(1);
    });

    it('throws if sender tries to sign up as an organization', async () => {
      const txParams = {
        to: hub.address,
        data: await hub.contract.methods.organizationSignup().encodeABI(),
      };
      await executeSafeTx(userSafe, txParams, safeOwner, 0, extraGas, safeOwner, web3);

      const logs = await userSafe.getPastEvents('ExecutionFailure', { fromBlock: 0, toBlock: 'latest' });

      return expect(logs).to.have.lengthOf(1);
    });
  });

  describe('new user can signup, when user is a safe proxy', async () => {
    let token = null;

    beforeEach(async () => {
      userSafe = await createSafeWithProxy(proxyFactory, safe, GnosisSafe, safeOwner);
      const txParams = {
        to: hub.address,
        data: await hub.contract.methods.signup().encodeABI(),
      };
      await executeSafeTx(userSafe, txParams, safeOwner, 0, extraGas, safeOwner, web3);
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

    it('throws if sender tries to sign up twice', async () => {
      const txParams = {
        to: hub.address,
        data: await hub.contract.methods.signup().encodeABI(),
      };
      await executeSafeTx(userSafe, txParams, safeOwner, 0, extraGas, safeOwner, web3);

      const logs = await userSafe.getPastEvents('ExecutionFailure', { fromBlock: 0, toBlock: 'latest' });

      return expect(logs).to.have.lengthOf(1);
    });

    it('throws if sender tries to sign up as an organization', async () => {
      const txParams = {
        to: hub.address,
        data: await hub.contract.methods.organizationSignup().encodeABI(),
      };
      await executeSafeTx(userSafe, txParams, safeOwner, 0, extraGas, safeOwner, web3);

      const logs = await userSafe.getPastEvents('ExecutionFailure', { fromBlock: 0, toBlock: 'latest' });

      return expect(logs).to.have.lengthOf(1);
    });
  });
});
