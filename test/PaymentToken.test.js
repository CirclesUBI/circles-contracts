const truffleContract = require('@truffle/contract');
const { executeSafeTx } = require('./helpers/executeSafeTx');
const { estimateBaseGas, estimateTxGas } = require('./helpers/estimateGas');
const {
  BigNumber,
  maxGas,
  extraGas,
  inflation,
  period,
  symbol,
  name,
  signupBonus,
  ZERO_ADDRESS,
  timeout,
} = require('./helpers/constants');
const { bn, convertToBaseUnit } = require('./helpers/math');
const { createSafeWithProxy } = require('./helpers/createSafeWithProxy');
const safeArtifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/GnosisSafe.sol/GnosisSafe.json');
const proxyArtifacts = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json');

const Hub = artifacts.require('MockHub');
const Token = artifacts.require('Token');

const GnosisSafe = truffleContract(safeArtifacts);
const ProxyFactory = truffleContract(proxyArtifacts);

GnosisSafe.setProvider(web3.currentProvider);
ProxyFactory.setProvider(web3.currentProvider);

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

contract('Token payments', ([_, safeOwner, recipient, anotherAccount, systemOwner]) => { // eslint-disable-line no-unused-vars
  let hub = null;
  let safe = null;
  let token = null;
  let proxyFactory = null;
  let userSafe = null;

  const initialConverted = convertToBaseUnit(signupBonus);

  beforeEach(async () => {
    hub = await Hub
      .new(
        inflation,
        period,
        symbol,
        name,
        initialConverted,
        initialConverted,
        timeout,
        { from: systemOwner, gas: maxGas },
      );
    safe = await GnosisSafe.new({ from: systemOwner });
    proxyFactory = await ProxyFactory.new({ from: systemOwner });

    userSafe = await createSafeWithProxy(proxyFactory, safe, GnosisSafe, safeOwner);

    const txParams = {
      to: hub.address,
      data: await hub.contract.methods.signup().encodeABI(),
    };
    await executeSafeTx(userSafe, txParams, safeOwner, 0, extraGas, safeOwner, web3);

    const blockNumber = await web3.eth.getBlockNumber();
    const signUpLogs = await hub.getPastEvents('Signup', { fromBlock: blockNumber - 1, toBlock: 'latest' });

    token = await Token.at(signUpLogs[0].args.token);
  });

  describe('user can use their token as payment token', () => {
    const amount = convertToBaseUnit(50);
    const gasCosts = bn(89645);

    it('should transfer tokens', async () => {
      const to = token.address;
      const data = await token.contract.methods
        .transfer(recipient, amount.toString())
        .encodeABI();
      const safeTxGas = await estimateTxGas(userSafe, to, 0, data, 0);
      const gasToken = token.address;
      const nonce = (await userSafe.nonce()).toNumber();
      const baseGas = await estimateBaseGas(userSafe, to, 0, data, 0,
        safeTxGas, gasToken, ZERO_ADDRESS, 1, nonce);
      const txParams = {
        to,
        data,
        gasPrice: 1,
        gasToken,
        safeTxGas,
        baseGas,
      };
      await executeSafeTx(userSafe, txParams, safeOwner, baseGas, safeTxGas, safeOwner, web3);

      (await token.balanceOf(recipient)).should.be.bignumber.equal(amount);
    });

    it('should transfer gas to the tx origin', async () => {
      const to = token.address;
      const data = await token.contract.methods
        .transfer(recipient, amount.toString())
        .encodeABI();
      const safeTxGas = await estimateTxGas(userSafe, to, 0, data, 0);
      const gasToken = token.address;
      const nonce = (await userSafe.nonce()).toNumber();
      const baseGas = await estimateBaseGas(userSafe, to, 0, data, 0,
        safeTxGas, gasToken, ZERO_ADDRESS, 1, nonce);
      const txParams = {
        to,
        data,
        gasPrice: 1,
        gasToken,
        safeTxGas,
        baseGas,
      };
      await executeSafeTx(userSafe, txParams, safeOwner, baseGas, safeTxGas, safeOwner, web3);

      (await token.balanceOf(safeOwner)).should.be.bignumber.equal(gasCosts);
    });

    it('safe should pay gas', async () => {
      const to = token.address;
      const data = await token.contract.methods
        .transfer(recipient, amount.toString())
        .encodeABI();
      const safeTxGas = await estimateTxGas(userSafe, to, 0, data, 0);
      const gasToken = token.address;
      const nonce = (await userSafe.nonce()).toNumber();
      const baseGas = await estimateBaseGas(userSafe, to, 0, data, 0,
        safeTxGas, gasToken, ZERO_ADDRESS, 1, nonce);
      const txParams = {
        to,
        data,
        gasPrice: 1,
        gasToken,
        safeTxGas,
        baseGas,
      };
      await executeSafeTx(userSafe, txParams, safeOwner, baseGas, safeTxGas, safeOwner, web3);

      (await token.balanceOf(userSafe.address)).should.be.bignumber.equal(amount.sub(gasCosts));
    });
  });
});
