const truffleContract = require('truffle-contract');

const { signTypedData } = require('./helpers/signTypedData');
const { formatTypedData } = require('./helpers/formatTypedData');
const { estimateBaseGas,
  estimateTxGas } = require('./helpers/estimateGas');

const Hub = artifacts.require('Hub');
const Token = artifacts.require('Token');
const safeArtifacts = require('@gnosis.pm/safe-contracts/build/contracts/GnosisSafe.json');

const GnosisSafe = truffleContract(safeArtifacts);
GnosisSafe.setProvider(web3.currentProvider);

const BigNumber = web3.utils.BN;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const decimals = new BigNumber(18);
const decimalsMultiplier = (new BigNumber(10)).pow(decimals);
const convert = number => (new BigNumber(number)).mul(decimalsMultiplier);
const bn = number => (new BigNumber(number));

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

contract('Token payments', ([_, owner, recipient, anotherAccount, systemOwner]) => { // eslint-disable-line no-unused-vars
  let hub = null;
  let safe = null;
  let token = null;

  const issuance = bn(1736111111111111);
  const demurrage = bn(0);
  const symbol = 'CRC';
  const tokenName = 'MyCoin';
  const initialPayout = convert(100);

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, issuance, demurrage, symbol, initialPayout);

    const operation = 0;
    const safeTxGas = 0;
    const baseGas = 0;
    const gasPrice = 0;
    const gasToken = ZERO_ADDRESS;
    const refundReceiver = ZERO_ADDRESS;
    const value = 0;

    safe = await GnosisSafe.new({ from: owner });
    await safe.setup([owner], 1, ZERO_ADDRESS, '0x', ZERO_ADDRESS, 0, ZERO_ADDRESS, { from: systemOwner });

    const to = hub.address;
    const data = await hub.contract.methods.signup(tokenName).encodeABI();
    const nonce = (await safe.nonce()).toString();

    const typedData = formatTypedData(
      to, value, data, operation, safeTxGas, baseGas, gasPrice,
      gasToken, refundReceiver, nonce, safe.address);

    const signatureBytes = await signTypedData(owner, typedData, web3);
    await safe.execTransaction(
      to, value, data, operation, safeTxGas, baseGas, gasPrice,
      gasToken, refundReceiver, signatureBytes,
      { from: owner, gas: 17721975 });

    const blockNumber = await web3.eth.getBlockNumber();
    const logs = await hub.getPastEvents('Signup', { fromBlock: blockNumber - 1, toBlock: 'latest' });

    token = await Token.at(logs[0].args.token);
  });

  describe('user can use their token as payment token', () => {
    const amount = convert(50);
    const gasCosts = bn(95041);

    it('should transfer tokens', async () => {
      const to = token.address;
      const data = await token.contract.methods
        .transfer(recipient, amount.toString())
        .encodeABI();
      const nonce = (await safe.nonce()).toString();
      const operation = 0;
      const gasPrice = 1;
      const value = 0;
      const gasToken = token.address;
      const refundReceiver = ZERO_ADDRESS;
      const safeTxGas = await estimateTxGas(safe, to, value, data, operation);
      baseGas = await estimateBaseGas(safe, to, value, data, operation,
        safeTxGas, gasToken, refundReceiver, 1, nonce)

      const typedData = formatTypedData(
        to, value, data, operation, safeTxGas, baseGas, gasPrice,
        gasToken, refundReceiver, nonce, safe.address);

      const signatureBytes = await signTypedData(owner, typedData, web3);
      await safe.execTransaction(
        to, value, data, operation, safeTxGas, baseGas, gasPrice,
        gasToken, refundReceiver, signatureBytes,
        { from: owner, gas: safeTxGas + baseGas });

      (await token.balanceOf(recipient)).should.be.bignumber.equal(amount);
    });

    it('should transfer gas to the tx origin', async () => {
      const to = token.address;
      const data = await token.contract.methods
        .transfer(recipient, amount.toString())
        .encodeABI();
      const nonce = (await safe.nonce()).toString();
      const operation = 0;
      const gasPrice = 1;
      const value = 0;
      const gasToken = token.address;
      const refundReceiver = ZERO_ADDRESS;
      const safeTxGas = await estimateTxGas(safe, to, value, data, operation);
      baseGas = await estimateBaseGas(safe, to, value, data, operation,
        safeTxGas, gasToken, refundReceiver, 1, nonce)

      const typedData = formatTypedData(
        to, value, data, operation, safeTxGas, baseGas, gasPrice,
        gasToken, refundReceiver, nonce, safe.address);

      const signatureBytes = await signTypedData(owner, typedData, web3);
      await safe.execTransaction(
        to, value, data, operation, safeTxGas, baseGas, gasPrice,
        gasToken, refundReceiver, signatureBytes,
        { from: owner, gas: safeTxGas + baseGas });

      (await token.balanceOf(owner)).should.be.bignumber.equal(gasCosts);
    });

    it('safe should pay gas', async () => {
      const to = token.address;
      const data = await token.contract.methods
        .transfer(recipient, amount.toString())
        .encodeABI();
      const nonce = (await safe.nonce()).toString();
      const operation = 0;
      const gasPrice = 1;
      const value = 0;
      const gasToken = token.address;
      const refundReceiver = ZERO_ADDRESS;
      const safeTxGas = await estimateTxGas(safe, to, value, data, operation);
      baseGas = await estimateBaseGas(safe, to, value, data, operation,
        safeTxGas, gasToken, refundReceiver, 1, nonce)

      const typedData = formatTypedData(
        to, value, data, operation, safeTxGas, baseGas, gasPrice,
        gasToken, refundReceiver, nonce, safe.address);

      const signatureBytes = await signTypedData(owner, typedData, web3);
      await safe.execTransaction(
        to, value, data, operation, safeTxGas, baseGas, gasPrice,
        gasToken, refundReceiver, signatureBytes,
        { from: owner, gas: safeTxGas + baseGas });

      (await token.balanceOf(safe.address)).should.be.bignumber.equal(amount.sub(gasCosts));
    });
  });
});
