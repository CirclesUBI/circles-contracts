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
  const _initialPayout = new BigNumber(100);

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, _issuance, _demurrage, _symbol, _initialPayout);
  });

  describe('constructor', async () => {
    it('sets the owner', async () => {
      (await hub.owner()).should.be.equal(systemOwner);
    });

    it('sets the issuance rate', async () => {
      (await hub.issuanceRate()).should.be.bignumber.equal(_issuance);
    });

    it('sets the demurrage rate', async () => {
      (await hub.demurrageRate()).should.be.bignumber.equal(_demurrage);
    });

    it('sets the decimals setting', async () => {
      (await hub.decimals()).should.be.bignumber.equal(_decimals);
    });

    it('sets the symbol', async () => {
      (await hub.symbol()).should.be.equal(_symbol);
    });
  })

  describe('attacker cannot change system vars', async () => {
    it('attacker cannot change owner', async () => {
      await assertRevert(hub.changeOwner(attacker, { from: attacker }))
    });

    it('attacker cannot change issuance', async () => {
      await assertRevert(hub.updateIssuance(42, { from: attacker }))
    });

    it('attacker cannot change demurrage', async () => {
      await assertRevert(hub.updateDemurrage(42, { from: attacker }))
    });

    it('attacker cannot change symbol', async () => {
      await assertRevert(hub.updateSymbol('PLUM', { from: attacker }))
    });
  })

  describe('owner can change system vars', async () => {
    it('owner can change owner', async () => {
      await hub.changeOwner(attacker, { from: systemOwner });
      (await hub.owner()).should.equal(attacker);
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
  })
});
