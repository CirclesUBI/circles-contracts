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

contract('Relayer', ([_, systemOwner, sender, api, attacker]) => {
  let hub;
  let relayer;
  let token;
  let metatxHandler;

  const _issuance = new BigNumber(1736111111111111);
  const _demurrage = new BigNumber(0);
  const _symbol = 'CRC';
  const _limitEpoch = new BigNumber(3600);
  const _tokenName = 'MyCoin';
  const _initialPayout = new BigNumber(100);

  const senderPrivKey = '2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501202';
  const apiPrivKey = '2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501203';
  const attackerPrivKey = '2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501204';
  let senderKeyPair;

  describe('relays a signup', () => {
    beforeEach(async () => {
      hub = await Hub.new(systemOwner, _issuance, _demurrage, _symbol, _limitEpoch, _initialPayout);
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
      it('should throw', async () => {
        const organizationSignup = await hub.organizationSignup({ from: attacker });

        const data = await hub.contract.methods.relayerSignup(attacker, _tokenName).encodeABI();
        const txParams = {
          from: attacker,
          to: hub.contract.options.address,
          value: 0,
          data,
        };
        const relayNonce = await metatxHandler.getRelayNonce(attacker);
        const signedMetaTx = await metatxHandler.signMetaTx(txParams, attackerPrivKey, relayNonce);
        return assertRevert(metatxHandler.signRelayerTx(signedMetaTx.metaSignedTx));
      })
    })

    describe('when not sent by a valid relayer', async () => {
      it('should throw', async () => {
        const setRelayer = hub.updateRelayer(relayer.contract.options.address, false, { from: systemOwner });
        const data = await hub.contract.methods.relayerSignup(sender, _tokenName).encodeABI();
        const txParams = {
          from: sender,
          to: hub.contract.options.address,
          value: 0,
          data,
        };
        const relayNonce = await metatxHandler.getRelayNonce(sender);
        const signedMetaTx = await metatxHandler.signMetaTx(txParams, senderPrivKey, relayNonce);
        return assertRevert(metatxHandler.signRelayerTx(signedMetaTx.metaSignedTx));
      })
    })

    describe('when claiming the wrong address', async () => {
      // this is actually testing contract logic, though it may not look like it
      // signRelayerTx calls estimate gas, which attempts to run the transaction virtually 
      // and triggers the contract address-checking. Nice extension would be to try and run the
      // transaction non-virtually, but might have to bypass web3 to do that
      // simply putting the attacker's address into the serialized raw transaction won't work
      // because web3 validates the signature before sending raw and changing the signed data makes
      // ecrecover return an incorrect address (one with no funds)
      it('should throw', async () => {
        const data = await hub.contract.methods.relayerSignup(attacker, _tokenName).encodeABI();
        const txParams = {
          from: sender,
          to: hub.contract.options.address,
          value: 0,
          data,
        };
        const relayNonce = await metatxHandler.getRelayNonce(sender);
        const signedMetaTx = await metatxHandler.signMetaTx(txParams, senderPrivKey, relayNonce);
        return assertRevert(metatxHandler.signRelayerTx(signedMetaTx.metaSignedTx));
      })
    })
  });
});
