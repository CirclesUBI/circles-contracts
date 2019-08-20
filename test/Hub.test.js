const truffleContract = require("truffle-contract");
const BigNumber = web3.utils.BN;
const { assertRevert } = require('./helpers/assertRevert');
const expectEvent = require('./helpers/expectEvent');
const safeArtifacts = require('gnosis-safe/build/contracts/GnosisSafe.json');

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

const Hub = artifacts.require('Hub');
const Token = artifacts.require('Token');
const GnosisSafe = truffleContract(safeArtifacts);
GnosisSafe.setProvider(web3.currentProvider)

contract('Hub', ([_, systemOwner, attacker, safeOwner]) => {
  let hub = null;
  let safe = null;

  const _issuance = new BigNumber(1736111111111111);
  const _demurrage = new BigNumber(0);
  const _symbol = 'CRC';
  const _limitEpoch = new BigNumber(3600);
  const _initialPayout = new BigNumber(100);
  const _tokenName = 'testToken'

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, _issuance, _demurrage, _symbol, _limitEpoch, _initialPayout);
    safe = await GnosisSafe.new({ from: safeOwner })
    await safe.setup([safeOwner], 1, safeOwner, '0x0', { from: safeOwner });
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

  describe('new user can signup, when user is an external account', async () => {
    beforeEach(async () => {
      await hub.signup(_tokenName, { from: safeOwner })
    });

    it('signup emits an event with correct sender', async () => {
        const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest'});
        const event = expectEvent.inLogs(logs, 'Signup', {
          user: safeOwner,
        });

        return event.args.user.should.equal(safeOwner);
    });

    it('token is owned by correct sender', async () => {
      const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest'});

      const event = expectEvent.inLogs(logs, 'Signup', {
        user: safeOwner,
      });

      tokenAddress = event.args.token;
      token = await Token.at(tokenAddress);
      (await token.owner()).should.be.equal(safeOwner);
    })

    it('token has the correct name', async () => {
      const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest'});

      const event = expectEvent.inLogs(logs, 'Signup', {
        user: safeOwner,
      });

      tokenAddress = event.args.token;
      token = await Token.at(tokenAddress);
      (await token.name()).should.be.equal(_tokenName);
    })

    it('throws if sender tries to sign up twice', async () => {
      await assertRevert(hub.signup(_tokenName, { from: safeOwner }));
    })

  })
});
