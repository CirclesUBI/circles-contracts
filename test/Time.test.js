const truffleContract = require('truffle-contract');

const { executeSafeTx } = require('./helpers/executeSafeTx');
const { estimateBaseGas, estimateTxGas } = require('./helpers/estimateGas');
const { BigNumber, ZERO_ADDRESS } = require('./helpers/constants');
const { bn, convertToBaseUnit } = require('./helpers/math');
const { increase } = require('./helpers/increaseTime');
const { getTimestamp } = require('./helpers/getTimestamp');

const Hub = artifacts.require('Hub');
const Token = artifacts.require('Token');
const safeArtifacts = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');

const GnosisSafe = truffleContract(safeArtifacts);
GnosisSafe.setProvider(web3.currentProvider);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

contract('Token payments', ([_, owner, recipient, anotherAccount, systemOwner]) => { // eslint-disable-line no-unused-vars
  let hub = null;
  let safe = null;
  let proxyFactory = null;

  const inflation = bn(275);
  const divisor = bn(100);
  const period = bn(7885000000);
  const symbol = 'CRC';
  const initialPayout = bn(100);
  const tokenName = 'testToken';

  const gas = 6721975;


  beforeEach(async () => {
    hub = await Hub.new(systemOwner, inflation, period, symbol, initialPayout);
    // safe = await GnosisSafe.new({ from: systemOwner });
    // await safe.setup([systemOwner], 1, ZERO_ADDRESS, '0x', ZERO_ADDRESS, 0, ZERO_ADDRESS, { from: systemOwner });
  });

  it("checks time", async () => {
    await sleep(500);
    const block = await web3.eth.getBlock('latest');
    const blocktime = bn(block.timestamp);
    console.log(blocktime.toString());
    const hubtime = await hub.time();
    console.log(hubtime.toString());
    (true).should.be.equal(true);

  })


  it("checks time 2", async () => {
    await sleep(500);
    const block = await web3.eth.getBlock('latest');
    const blocktime = bn(block.timestamp);
    console.log(blocktime.toString());
    const hubtime = await hub.time();
    console.log(hubtime.toString());
    (true).should.be.equal(true);
  })


  it("checks time 3", async () => {
    await sleep(500);
    const block = await web3.eth.getBlock('latest');
    const blocktime = bn(block.timestamp);
    console.log(blocktime.toString());
    const hubtime = await hub.time();
    console.log(hubtime.toString());
    (true).should.be.equal(true);
  })


  it("checks time 4", async () => {
    await sleep(500);
    const block = await web3.eth.getBlock('latest');
    const blocktime = bn(block.timestamp);
    console.log(blocktime.toString());
    const hubtime = await hub.time();
    console.log(hubtime.toString());
    (true).should.be.equal(true);
  })


  it("checks time 5", async () => {
    await sleep(500);
    const block = await web3.eth.getBlock('latest');
    const blocktime = bn(block.timestamp);
    console.log(blocktime.toString());
    const hubtime = await hub.time();
    console.log(hubtime.toString());
    (true).should.be.equal(true);
  })


  it("checks time 6", async () => {
    await sleep(500);
    const block = await web3.eth.getBlock('latest');
    const blocktime = bn(block.timestamp);
    console.log(blocktime.toString());
    const hubtime = await hub.time();
    console.log(hubtime.toString());
    (true).should.be.equal(true);
  })

});
