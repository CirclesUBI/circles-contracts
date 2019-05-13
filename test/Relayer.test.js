const { assertRevert } = require('./helpers/assertRevert');
const MetaTxHandler = require('metatx-server');
const expectEvent = require('./helpers/expectEvent');

const Hub = artifacts.require('Hub');
const Relayer = artifacts.require('TxRelay');
const Token = artifacts.require('Token');

const BigNumber = web3.utils.BN;

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

contract('Relayer', ([_, systemOwner, sender, api]) => {

  describe('relays a signup', () => {
    let hub;
    let relayer;
    let token;
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
      metatxHandler = new MetaTxHandler(
        apiPrivKey,
        web3.currentProvider,
        relayer.contract.options.address,
        Relayer.abi
      );
      senderKeyPair = metatxHandler.getSenderKeyPair(senderPrivKey);
      return hub.updateRelayer(relayer.contract.options.address, true, { from: systemOwner });
    });

    describe('when the sender and signature are valid', async () => {
      beforeEach(async () => {
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

        return metatxHandler.sendRawTransaction(signedRawTx);
      })

      it('generates a signup event for sender', async () => {
        const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest'});

        const event = expectEvent.inLogs(logs, 'Signup', {
          user: sender,
        });

        tokenAddress = event.args.token;
        return event.args.user.should.equal(sender);
      });

      it('token is owned by sender', async () => {
        const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest'});

        const event = expectEvent.inLogs(logs, 'Signup', {
          user: sender,
        });

        tokenAddress = event.args.token;
        token = await Token.at(tokenAddress);
        (await token.owner()).should.be.equal(sender);
      })

      it('token has the correct name', async () => {
        const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest'});

        const event = expectEvent.inLogs(logs, 'Signup', {
          user: sender,
        });

        tokenAddress = event.args.token;
        token = await Token.at(tokenAddress);
        (await token.name()).should.be.equal(_tokenName);
      })

      it('throws if sender tries to sign up twice', async () => {
        await assertRevert(hub.signup(_tokenName, { from: sender }));
      })
    });

    describe('when the sender is an organization', async () => {
      //write me
    })

    describe('when the signature is invalid', async () => {
      //write me
    })
  });
});
