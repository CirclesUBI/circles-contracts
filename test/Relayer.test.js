const { assertRevert } = require('./helpers/assertRevert');
const MetaTxHandler = require('metatx-server');
const expectEvent = require('./helpers/expectEvent');

const Hub = artifacts.require('Hub');
const Relayer = artifacts.require('TxRelay');

const BigNumber = web3.utils.BN;

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

contract('Relayer', ([_, systemOwner, sender, api]) => {
  let hub = null;
  let relayer = null;
  let token = null;
  let metatxHandler;

  const _issuance = new BigNumber(1736111111111111);
  const _demurrage = new BigNumber(0);
  const _decimals = new BigNumber(18);
  const _symbol = 'CRC';
  const _limitEpoch = new BigNumber(3600);
  const _tokenName = 'MyCoin';
  const _initialPayout = new BigNumber(100);

  const senderPrivKey = '2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501202';
  const apiPrivKey = '2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501203';
  let senderKeyPair;

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, _issuance, _demurrage, _decimals, _symbol, _limitEpoch, _initialPayout);
    relayer = await Relayer.new();
    console.log(Relayer.deployed().address)
    metatxHandler = new MetaTxHandler(
      apiPrivKey,
      web3.currentProvider,
      relayer.contract.options.address,
      Relayer.abi
    );
    senderKeyPair = metatxHandler.getSenderKeyPair(senderPrivKey);
    return hub.updateRelayer(relayer.contract.options.address, true, { from: systemOwner });
  });

  describe('correctly relays a signup', () => {
    let token;

    // before(async () => {
    //   return hub.updateRelayer(relayer.contract.options.address, true, { from: systemOwner });
    // })

    it('should generate signup event', async () => {
      //hub.contract.address = Hub.deployed().address;
      console.log(sender)
      console.log(api)
      console.log(senderKeyPair.address)
      const data = await hub.contract.methods.relayerSignup(sender, _tokenName).encodeABI();
      const txParams = {
        from: sender,
        to: hub.contract.options.address,
        value: 0,
        data,
      };
      const relayNonce = await metatxHandler.getRelayNonce(sender);
      const signedMetaTx = await metatxHandler.signMetaTx(txParams, senderPrivKey, relayNonce);
      const signedRawTx = await metatxHandler.signRelayerTx(signedMetaTx.metaSignedTx);

      const { logs } = await metatxHandler.sendRawTransaction(signedRawTx);

      console.log(logs)

      const event = expectEvent.inLogs(logs, 'Signup', {
        user: sender
      });

      token = event.args.token;
      event.args.user.should.be.bignumber.equal(sender);
    });
  });
});
