const BigNumber = web3.utils.BN;
const { assertRevert } = require('./helpers/assertRevert');

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

const Hub = artifacts.require('Hub');
const Token = artifacts.require('Token');

contract('Hub', ([_, systemOwner, attacker, alice, brian, carol, derek, validator, organisation]) => {
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

    it('sets the symbol', async () => {
      (await hub.symbol()).should.be.equal(_symbol);
    });
  });

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
  });

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
  });

  describe('signup', async () => {
    beforeEach(async () => {
      await hub.signup(alice, "AliceCoin");
    })

    it('reverts if the user has already signed up', async () => {
      await assertRevert(hub.signup(alice, 'AliceCoin'))
    });

    it('populates the user <-> token mappings', async () => {
      const token = await hub.userToToken(alice)
      token.should.not.be.equal('');
      (await hub.tokenToUser(token)).should.be.equal(alice);
    });

    it('pays out the inital payment', async () => {
      const token = await Token.at(await hub.userToToken(alice));
      (await token.balanceOf(alice)).should.be.bignumber.equal(_initialPayout);
    });

    it('sets the token name', async () => {
      const token = await Token.at(await hub.userToToken(alice));
      (await token.name()).should.be.equal('AliceCoin');
    });
  });

  describe('trust', async () => {
    const limit = new BigNumber(100);

    beforeEach(async () => {
      await hub.signup(alice, "AliceCoin");
      await hub.signup(brian, "BrianCoin");
      await hub.registerValidator(validator);
    })

    it('reverts if the trustee has not signed up', async () => {
      await assertRevert(hub.trust(carol, limit, {from: alice}));
    });

    it('signed up users can be trusted', async () => {
      await hub.trust(brian, limit, {from: alice});
      (await hub.edges(alice, brian)).should.be.bignumber.equal(limit);
    });

    it('validators can be trusted', async () => {
      await hub.trust(validator, limit, {from: alice});
      (await hub.edges(alice, validator)).should.be.bignumber.equal(limit);
    });
  });

  describe('transferThrough', async () => {

    // --- setup ---

    beforeEach(async () => {
      await hub.signup(alice, "AliceCoin");
      await hub.signup(brian, "BrianCoin");
      await hub.signup(carol, "CarolCoin");
      await hub.signup(derek, "DerekCoin");
      await hub.registerValidator(validator);
    });

    // --- utils ---

    // throw if dst has not recieved wad from src
    const assertTransfered = async (src, dst, wad) => {
      const srcCoin = await Token.at(await hub.userToToken(src));
      const dstCoin = await Token.at(await hub.userToToken(dst));

      (await srcCoin.balanceOf(src)).should.be.bignumber.equal(_initialPayout.sub(wad));
      (await srcCoin.balanceOf(dst)).should.be.bignumber.equal(wad);
    }

    // throw if usr's coin has moved at all
    const assertStationary = async (usr) => {
      const coin = await Token.at(await hub.userToToken(usr));
      (await coin.balanceOf(usr)).should.be.bignumber.equal(_initialPayout);
    }

    // --- data ---

    const wad = new BigNumber(10);

    // --- tests ---

    it('single hop transfer between registered users', async () => {
      await hub.trust(alice, wad, {from: brian});
      await hub.trust(brian, wad, {from: alice});

      await hub.transferThrough([brian], wad, {from: alice});

      assertTransfered(alice, brian, wad);
      assertStationary(brian);
    });

    it('single hop transfer through a validator', async () => {
      await hub.trust(alice, wad, {from: validator});
      await hub.trust(validator, wad, {from: brian});

      await hub.transferThrough([validator, brian], wad, {from: alice});

      assertTransfered(alice, brian, wad);
      assertStationary(brian);
    });

    it('multi hop transfer through registered users and validator', async () => {
      await hub.trust(alice, wad, {from: brian});
      await hub.trust(brian, wad, {from: carol});
      await hub.trust(carol, wad, {from: validator});
      await hub.trust(validator, wad, {from: derek});

      await hub.transferThrough([brian, carol, validator, derek], wad, {from: alice});

      assertTransfered(alice, brian, wad);
      assertTransfered(brian, carol, wad);
      assertTransfered(carol, derek, wad);
      assertStationary(derek);
    });

  });
});
