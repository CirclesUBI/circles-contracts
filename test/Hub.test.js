const BigNumber = web3.utils.BN;
const { assertRevert } = require('./helpers/assertRevert');

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

const Hub = artifacts.require('Hub');

contract('Hub', ([_, systemOwner, attacker]) => {
  let hub = null;

  const _issuance = new BigNumber(1736111111111111);
  const _demurrage = new BigNumber(0);
  const _symbol = 'CRC';
  const _limitEpoch = new BigNumber(3600);
  const _initialPayout = new BigNumber(100);

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, _issuance, _demurrage, _symbol, _limitEpoch, _initialPayout);
  });

  it('has the correct owner', async () => {
    (await hub.owner()).should.be.equal(systemOwner);
  });

  it('attacker cannot change owner', async () => {
    await assertRevert(hub.changeOwner(attacker, { from: attacker }))
  });

  it('has an issuance rate', async () => {
    (await hub.issuanceRate()).should.be.bignumber.equal(_issuance);
  });

  it('attacker cannot change issuance', async () => {
    await assertRevert(hub.updateIssuance(42, { from: attacker }))
  });

  it('has a demurrage rate', async () => {
    (await hub.demurrageRate()).should.be.bignumber.equal(_demurrage);
  });

  it('attacker cannot change demurrage', async () => {
    await assertRevert(hub.updateDemurrage(42, { from: attacker }))
  });

  it('has a symbol', async () => {
    (await hub.symbol()).should.be.equal(_symbol);
  });

  it('attacker cannot change symbol', async () => {
    await assertRevert(hub.updateSymbol('PLUM', { from: attacker }))
  });

  it('has a limit epoch value', async () => {
    (await hub.LIMIT_EPOCH()).should.be.bignumber.equal(_limitEpoch);
  });

  it('attacker cannot change limit epoch', async () => {
    await assertRevert(hub.updateLimitEpoch(42, { from: attacker }))
  });

  describe('owner can change system vars', async () => {
    after(async () => {
      await hub.updateIssuance(_issuance, { from: systemOwner })
      await hub.updateDemurrage(_demurrage, { from: systemOwner });
      await hub.updateSymbol(_symbol, { from: systemOwner });
      return hub.updateLimitEpoch(_limitEpoch, { from: systemOwner });
    });

    it('owner can change issuance', async () => {
      await hub.updateIssuance(1, { from: systemOwner });
      (await hub.issuanceRate()).should.be.bignumber.equal(new BigNumber(1));
    });

    it('owner can change demurrage', async () => {
      await hub.updateDemurrage(1, { from: systemOwner });
      (await hub.demurrageRate()).should.be.bignumber.equal(new BigNumber(1));
    });

    it('owner can change symbol', async () => {
      await hub.updateSymbol('PLUM', { from: systemOwner });
      (await hub.symbol()).should.be.equal('PLUM');
    });

    it('owner can change limit epoch', async () => {
      await hub.updateLimitEpoch(1, { from: systemOwner });
      (await hub.LIMIT_EPOCH()).should.be.bignumber.equal(new BigNumber(1));
    });
  })
});
