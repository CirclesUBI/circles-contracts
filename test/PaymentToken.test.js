const truffleContract = require('truffle-contract');

const { executeSafeTx } = require('./helpers/executeSafeTx');
const { estimateBaseGas, estimateTxGas } = require('./helpers/estimateGas');
const { BigNumber, ZERO_ADDRESS } = require('./helpers/constants');
const { bn, convertToBaseUnit } = require('./helpers/math');

const Hub = artifacts.require('Hub');
const Token = artifacts.require('Token');
const safeArtifacts = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');

const GnosisSafe = truffleContract(safeArtifacts);
GnosisSafe.setProvider(web3.currentProvider);

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

contract('Token payments', ([_, owner, recipient, anotherAccount, systemOwner]) => { // eslint-disable-line no-unused-vars
  let hub = null;
  let safe = null;
  let token = null;

  const inflation = bn(275);
  const divisor = bn(100);
  const period = bn(7885000000);
  const symbol = 'CRC';
  const tokenName = 'MyCoin';
  const initialPayout = convertToBaseUnit(100);

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, inflation, divisor, period, symbol, initialPayout);

    safe = await GnosisSafe.new({ from: owner });
    await safe.setup([owner], 1, ZERO_ADDRESS, '0x', ZERO_ADDRESS, 0, ZERO_ADDRESS, { from: systemOwner });

    const txParams = {
      to: hub.address,
      data: await hub.contract.methods.signup(tokenName).encodeABI(),
    };
    await executeSafeTx(safe, txParams, owner, 17721975, owner, web3);

    const blockNumber = await web3.eth.getBlockNumber();
    const logs = await hub.getPastEvents('Signup', { fromBlock: blockNumber - 1, toBlock: 'latest' });

    token = await Token.at(logs[0].args.token);
  });

  describe('user can use their token as payment token', () => {
    const amount = convertToBaseUnit(50);
    const gasCosts = bn(35508);

    it('should transfer tokens', async () => {
      const to = token.address;
      const data = await token.contract.methods
        .transfer(recipient, amount.toString())
        .encodeABI();
      const safeTxGas = await estimateTxGas(safe, to, 0, data, 0);
      const gasToken = token.address;
      const nonce = (await safe.nonce()).toNumber();
      const baseGas = await estimateBaseGas(safe, to, 0, data, 0,
        safeTxGas, gasToken, ZERO_ADDRESS, 1, nonce);
      const txParams = {
        to,
        data,
        gasPrice: 1,
        gasToken,
        safeTxGas,
        baseGas,
      };
      await executeSafeTx(safe, txParams, owner, safeTxGas + baseGas, owner, web3);

      (await token.balanceOf(recipient)).should.be.bignumber.equal(amount);
    });

    it('should transfer gas to the tx origin', async () => {
      const to = token.address;
      const data = await token.contract.methods
        .transfer(recipient, amount.toString())
        .encodeABI();
      const safeTxGas = await estimateTxGas(safe, to, 0, data, 0);
      const gasToken = token.address;
      const nonce = (await safe.nonce()).toNumber();
      const baseGas = await estimateBaseGas(safe, to, 0, data, 0,
        safeTxGas, gasToken, ZERO_ADDRESS, 1, nonce);
      const txParams = {
        to,
        data,
        gasPrice: 1,
        gasToken,
        safeTxGas,
        baseGas,
      };
      await executeSafeTx(safe, txParams, owner, safeTxGas + baseGas, owner, web3);

      (await token.balanceOf(owner)).should.be.bignumber.equal(gasCosts);
    });

    it('safe should pay gas', async () => {
      const to = token.address;
      const data = await token.contract.methods
        .transfer(recipient, amount.toString())
        .encodeABI();
      const safeTxGas = await estimateTxGas(safe, to, 0, data, 0);
      const gasToken = token.address;
      const nonce = (await safe.nonce()).toNumber();
      const baseGas = await estimateBaseGas(safe, to, 0, data, 0,
        safeTxGas, gasToken, ZERO_ADDRESS, 1, nonce);
      const txParams = {
        to,
        data,
        gasPrice: 1,
        gasToken,
        safeTxGas,
        baseGas,
      };
      await executeSafeTx(safe, txParams, owner, safeTxGas + baseGas, owner, web3);

      (await token.balanceOf(safe.address)).should.be.bignumber.equal(amount.sub(gasCosts));
    });
  });
});
