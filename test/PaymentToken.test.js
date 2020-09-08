const truffleContract = require('@truffle/contract');
const { executeSafeTx } = require('./helpers/executeSafeTx');
const { estimateBaseGas, estimateTxGas } = require('./helpers/estimateGas');
const {
  BigNumber,
  maxGas,
  inflation,
  period,
  symbol,
  initialPayout,
  ZERO_ADDRESS,
} = require('./helpers/constants');
const { bn, convertToBaseUnit } = require('./helpers/math');
const { createSafeWithProxy } = require('./helpers/createSafeWithProxy');
const safeArtifacts = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const proxyArtifacts = require('@circles/safe-contracts/build/contracts/ProxyFactory.json');

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

  const initialConverted = convertToBaseUnit(initialPayout);

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, inflation, period, symbol, initialConverted, initialConverted,
      { from: systemOwner, gas: maxGas });

    safe = await GnosisSafe.new({ from: systemOwner });
    proxyFactory = await ProxyFactory.new({ from: systemOwner });

    userSafe = await createSafeWithProxy(proxyFactory, safe, GnosisSafe, safeOwner);

    const txParams = {
      to: hub.address,
      data: await hub.contract.methods.signup().encodeABI(),
    };
    await executeSafeTx(userSafe, txParams, safeOwner, 17721975, safeOwner, web3);

    const blockNumber = await web3.eth.getBlockNumber();
    const signUpLogs = await hub.getPastEvents('Signup', { fromBlock: blockNumber - 1, toBlock: 'latest' });

    token = await Token.at(signUpLogs[0].args.token);
  });

  describe('user can use their token as payment token', () => {
    const amount = convertToBaseUnit(50);
    const gasCosts = bn(35123);

    it('should transfer tokens', async () => {
      const to = token.address;
      const data = await token.contract.methods
        .transfer(recipient, amount.toString())
        .encodeABI();
      const safeTxGas = 300721975 //await estimateTxGas(userSafe, to, 0, data, 0);
      const gasToken = token.address;
      const nonce = (await userSafe.nonce()).toNumber();
      const baseGas = await estimateBaseGas(userSafe, to, 0, data, 0,
        safeTxGas, gasToken, ZERO_ADDRESS, 1, nonce);
      console.log(baseGas)
      const bal = await token.balanceOf(userSafe.address)
      console.log(bal.toString())
      console.log(safeTxGas)
      console.log(baseGas)
      const txParams = {
        to,
        data,
        gasPrice: 1,
        gasToken,
        safeTxGas,
        baseGas,
      };
      await executeSafeTx(userSafe, txParams, safeOwner, safeTxGas + baseGas, safeOwner, web3);

      (await token.balanceOf(recipient)).should.be.bignumber.equal(amount);
    });

    // it('should transfer gas to the tx origin', async () => {
    //   const to = token.address;
    //   const data = await token.contract.methods
    //     .transfer(recipient, amount.toString())
    //     .encodeABI();
    //   const safeTxGas = await estimateTxGas(userSafe, to, 0, data, 0);
    //   const gasToken = token.address;
    //   const nonce = (await userSafe.nonce()).toNumber();
    //   const baseGas = await estimateBaseGas(userSafe, to, 0, data, 0,
    //     safeTxGas, gasToken, ZERO_ADDRESS, 1, nonce);
    //   const txParams = {
    //     to,
    //     data,
    //     gasPrice: 1,
    //     gasToken,
    //     safeTxGas,
    //     baseGas,
    //   };
    //   await executeSafeTx(userSafe, txParams, safeOwner, safeTxGas + baseGas, safeOwner, web3);

    //   (await token.balanceOf(safeOwner)).should.be.bignumber.equal(gasCosts);
    // });

    // it('safe should pay gas', async () => {
    //   const to = token.address;
    //   const data = await token.contract.methods
    //     .transfer(recipient, amount.toString())
    //     .encodeABI();
    //   const safeTxGas = await estimateTxGas(userSafe, to, 0, data, 0);
    //   const gasToken = token.address;
    //   const nonce = (await userSafe.nonce()).toNumber();
    //   const baseGas = await estimateBaseGas(userSafe, to, 0, data, 0,
    //     safeTxGas, gasToken, ZERO_ADDRESS, 1, nonce);
    //   const txParams = {
    //     to,
    //     data,
    //     gasPrice: 1,
    //     gasToken,
    //     safeTxGas,
    //     baseGas,
    //   };
    //   await executeSafeTx(userSafe, txParams, safeOwner, safeTxGas + baseGas, safeOwner, web3);

    //   (await token.balanceOf(userSafe.address)).should.be.bignumber.equal(amount.sub(gasCosts));
    // });
  });
});
