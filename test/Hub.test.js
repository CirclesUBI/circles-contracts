const BigNumber = web3.utils.BN;

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

//BigNumber = require('bignumber.js')

const Hub = artifacts.require('Hub');

contract('Hub', function ([_, systemOwner, attacker]) {
  let hub = null;

  const _issuance = new BigNumber(1736111111111111);
  const _demurrage = new BigNumber(0);
  const _decimals = new BigNumber(18);
  const _symbol = 'CRC';
  const _limitEpoch = new BigNumber(3600);

  beforeEach(async function () {
    hub = await Hub.new(systemOwner, _issuance, _demurrage, _decimals, _symbol, _limitEpoch);
  });

  it('has an issuance rate', async function () {
    (await hub.issuanceRate()).should.be.bignumber.equal(_issuance);
  });

  it('has a demurrage rate', async function () {
    (await hub.demurrageRate()).should.be.bignumber.equal(_demurrage);
  });

  it('has a decimals setting', async function () {
    (await hub.decimals()).should.be.bignumber.equal(_decimals);
  });

  it('has a symbol', async function () {
    (await hub.symbol()).should.be.equal(_symbol);
  });

  it('has a limit epoch value', async function () {
    (await hub.LIMIT_EPOCH()).should.be.bignumber.equal(_limitEpoch);
  });
});
