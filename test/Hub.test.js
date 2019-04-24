const BigNumber = web3.utils.BN;
const { assertRevert } = require('./helpers/assertRevert');

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

const Hub = artifacts.require('Hub');
const Token = artifacts.require('Token');

contract('Hub', ([_, systemOwner, attacker, alice, bob, carol, dave, validator, organisation]) => {
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
    beforeEach(async () => {
      await hub.signup(alice, "AliceCoin");
      await hub.signup(bob, "BobCoin");
      await hub.registerValidator(validator);
    })

    it('reverts if the trustee has not signed up', async () => {
      await assertRevert(hub.trust(carol, 100, {from: alice}));
    });

    describe('updates limit in correct leaf on the trust graph', async () => {
      it('for signed up users', async () => {
        await hub.trust(bob, 100, {from: alice});
        (await hub.edges(alice, bob)).should.be.bignumber.equal(new BigNumber(100));
      });
      it('for validators', async () => {
        await hub.trust(validator, 100, {from: alice});
        (await hub.edges(alice, validator)).should.be.bignumber.equal(new BigNumber(100));
      });
    });
  });

  describe('transferThrough', async () => {
    beforeEach(async () => {
      await hub.signup(alice, "AliceCoin");
      await hub.signup(bob, "BobCoin");
      await hub.signup(carol, "CarolCoin");
      await hub.signup(dave, "DaveCoin");
      await hub.registerValidator(validator);
    });

    it('single hop transfer between registered users', async () => {
      await hub.trust(alice, 100, {from: bob});
      await hub.trust(bob, 100, {from: alice});

      const wad = new BigNumber(10);

      await hub.transferThrough([bob], wad, {from: alice});

      const aliceCoin = await Token.at(await hub.userToToken(alice));
      const bobCoin = await Token.at(await hub.userToToken(bob));

      // alice has transfered 10 AliceCoin to bob
      (await aliceCoin.balanceOf(alice)).should.be.bignumber.equal(_initialPayout.sub(wad));
      (await aliceCoin.balanceOf(bob)).should.be.bignumber.equal(wad);

      // bob has not moved any tokens
      (await bobCoin.balanceOf(alice)).should.be.bignumber.equal(new BigNumber(0));
      (await bobCoin.balanceOf(bob)).should.be.bignumber.equal(_initialPayout);
    });

    it('multi hop transfer between registered users', async () => {
      await hub.trust(alice, 100, {from: bob});
      await hub.trust(bob, 100, {from: alice});

      await hub.trust(bob, 100, {from: carol});
      await hub.trust(carol, 100, {from: bob});

      await hub.trust(carol, 100, {from: dave});
      await hub.trust(dave, 100, {from: carol});

      const wad = new BigNumber(10);

      await hub.transferThrough([bob, carol, dave], wad, {from: alice});

      const aliceCoin = await Token.at(await hub.userToToken(alice));
      const bobCoin = await Token.at(await hub.userToToken(bob));
      const carolCoin = await Token.at(await hub.userToToken(carol));
      const daveCoin = await Token.at(await hub.userToToken(dave));

      // alice has transfered 10 AliceCoin to bob
      (await aliceCoin.balanceOf(alice)).should.be.bignumber.equal(_initialPayout.sub(wad));
      (await aliceCoin.balanceOf(bob)).should.be.bignumber.equal(wad);

      // bob has transfered 10 BobCoin to carol
      (await bobCoin.balanceOf(bob)).should.be.bignumber.equal(_initialPayout.sub(wad));
      (await bobCoin.balanceOf(carol)).should.be.bignumber.equal(wad);

      //// carol has transfered 10 CarolCoin to dave
      (await carolCoin.balanceOf(carol)).should.be.bignumber.equal(_initialPayout.sub(wad));
      (await carolCoin.balanceOf(dave)).should.be.bignumber.equal(wad);

      //// dave has not moved any tokens
      (await daveCoin.balanceOf(alice)).should.be.bignumber.equal(new BigNumber(0));
      (await daveCoin.balanceOf(bob)).should.be.bignumber.equal(new BigNumber(0));
      (await daveCoin.balanceOf(carol)).should.be.bignumber.equal(new BigNumber(0));
      (await daveCoin.balanceOf(dave)).should.be.bignumber.equal(_initialPayout);
    });
  });
});
