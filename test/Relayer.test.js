const { assertRevert } = require('./helpers/assertRevert');
const MetaTxHandler = require('metatx-server')
const expectEvent = require('./helpers/expectEvent');

const Hub = artifacts.require('Hub');
const Relayer = artifacts.require('TxRelay');

const BigNumber = web3.utils.BN;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('Hub', ([_, systemOwner, attacker]) => {
  let hub = null;
  let relayer = null;
  let token = null;

  const _issuance = new BigNumber(1736111111111111);
  const _demurrage = new BigNumber(0);
  const _decimals = new BigNumber(18);
  const _symbol = 'CRC';
  const _limitEpoch = new BigNumber(3600);
  const _tokenName = 'MyCoin';
  const _initialPayout = new BigNumber(100);

  const senderPrivKey = 'a19ebcbe905b1daa2a4294849f9e6e9c125b42fb6737cab6facd1253282eaeee'

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, _issuance, _demurrage, _decimals, _symbol, _limitEpoch, _initialPayout);
    relayer = await Relayer.new();
  });

  `signMetaTx (txParams, senderPrivKey, relayNonce, whitelist)`

  describe('correctly relays a signup', () => {
    before(async () => {
      const metatxHandler = MetaTxHandler
      const senderKeyPair = MetaTxHandler.getSenderKeyPair(senderPrivKey);
      const txParams = {
        from: tokenQwner,
        to: hub.deployed().address,
        value: 0,
        data: Hub.methods.methodName(senderKeyPair.address, 'test').encodeABI()
      };
      const relayNonce = await MetaTxHandler
      MetaTxHandler.signMetaTx(txParams, senderPrivKey)
    })

    it('returns the total amount of tokens', async () => {
      (await token.totalSupply()).should.be.bignumber.equal(new BigNumber(100));
    });
  });
});
