const truffleContract = require("truffle-contract");
const BigNumber = web3.utils.BN;
const { assertRevert } = require('./helpers/assertRevert');
const { signTypedData } = require('./helpers/signTypedData');
const { formatTypedData } = require('./helpers/formatTypedData');
const expectEvent = require('./helpers/expectEvent');
const safeArtifacts = require('gnosis-safe/build/contracts/GnosisSafe.json');

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

const Hub = artifacts.require('Hub');
const Token = artifacts.require('Token');
const GnosisSafe = truffleContract(safeArtifacts);
GnosisSafe.setProvider(web3.currentProvider)

contract('Hub', ([_, systemOwner, attacker, safeOwner, normalUser]) => {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  let hub = null;
  let safe = null;

  const _issuance = new BigNumber(1736111111111111);
  const _demurrage = new BigNumber(0);
  const _symbol = 'CRC';
  const _initialPayout = new BigNumber(100);
  const _tokenName = 'testToken'

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, _issuance, _demurrage, _symbol, _initialPayout);
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

  describe('owner can change system vars', async () => {

    after(async () => {
      await hub.updateIssuance(_issuance, { from: systemOwner })
      await hub.updateDemurrage(_demurrage, { from: systemOwner });
      await hub.updateSymbol(_symbol, { from: systemOwner });
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

  describe('new user can signup, when user is a safe', async () => {
    beforeEach(async () => {
      const to = hub.address
      const value = 0
      const data = await hub.contract.methods.signup(_tokenName).encodeABI();
      const operation = 0
      const safeTxGas = 0
      const dataGas = 0
      const gasPrice = 0
      const gasToken = ZERO_ADDRESS
      const refundReceiver = ZERO_ADDRESS
      const nonce = (await safe.nonce()).toNumber()

      const typedData = formatTypedData(to, value, data, operation, safeTxGas, dataGas, gasPrice, gasToken, refundReceiver, nonce, safe.address)
      
      const signatureBytes = await signTypedData(safeOwner, typedData, web3)
      await safe.execTransaction(to, value, data, operation, safeTxGas, dataGas, gasPrice, gasToken, refundReceiver, signatureBytes,
        { from: safeOwner, gas: 17592186044415 })
    });

    it('signup emits an event with correct sender', async () => {
        const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest' });

        const event = expectEvent.inLogs(logs, 'Signup', {
          user: safe.address,
        });

        return event.args.user.should.equal(safe.address);
    });

    it('token is owned by correct sender', async () => {
      const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest'});

      const event = expectEvent.inLogs(logs, 'Signup', {
        user: safe.address,
      });

      tokenAddress = event.args.token;
      token = await Token.at(tokenAddress);
      (await token.owner()).should.be.equal(safe.address);
    })

    it('token has the correct name', async () => {
      const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest'});

      const event = expectEvent.inLogs(logs, 'Signup', {
        user: safe.address,
      });

      tokenAddress = event.args.token;
      token = await Token.at(tokenAddress);
      (await token.name()).should.be.equal(_tokenName);
    })

    it('throws if sender tries to sign up twice', async () => {
      const to = hub.address
      const value = 0
      const data = await hub.contract.methods.signup(_tokenName).encodeABI();
      const operation = 0
      const safeTxGas = 0
      const dataGas = 0
      const gasPrice = 0
      const gasToken = ZERO_ADDRESS
      const refundReceiver = ZERO_ADDRESS
      const nonce = (await safe.nonce()).toNumber()
      
      const typedData = formatTypedData(to, value, data, operation, safeTxGas, dataGas, gasPrice, gasToken, refundReceiver, nonce, safe.address)

      const signatureBytes = await signTypedData(safeOwner, typedData, web3)
      await safe.execTransaction(to, value, data, operation, safeTxGas, dataGas, gasPrice, gasToken, refundReceiver, signatureBytes,
          { from: safeOwner, gas: 17592186044415 })

      const logs = await safe.getPastEvents('ExecutionFailed', { fromBlock: 0, toBlock: 'latest' });

      return expect(logs).to.have.lengthOf(1);
    })

  })

  describe('user can set trust limits', async () => {
    const trustLimit = 50;

    describe('when trust destination is not a circles token', async () => {

      beforeEach(async () => {
        await hub.signup(_tokenName, { from: safeOwner });
      });

      it('should throw', async () => {
          return assertRevert(hub.trust(normalUser, trustLimit));
      });
    });

    describe('when trust destination is a circles token', async () => {
      beforeEach(async () => {
        await hub.signup(_tokenName, { from: safeOwner });
        await hub.signup(_tokenName, { from: normalUser });
        await hub.trust(normalUser, trustLimit, { from: safeOwner });
      });

      it('creates a trust event', async () => {
          const logs = await hub.getPastEvents('Trust', { fromBlock: 0, toBlock: 'latest'});

          return expectEvent.inLogs(logs, 'Trust', {
            from: safeOwner,
            to: normalUser
          });

          return event.args.limit.should.equal(new BigNumber(trustLimit));
      });
    })


    // it('token is owned by correct sender', async () => {
    //   const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest'});

    //   const event = expectEvent.inLogs(logs, 'Signup', {
    //     user: safeOwner,
    //   });

    //   tokenAddress = event.args.token;
    //   token = await Token.at(tokenAddress);
    //   (await token.owner()).should.be.equal(safeOwner);
    // })

    // it('token has the correct name', async () => {
    //   const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest'});

    //   const event = expectEvent.inLogs(logs, 'Signup', {
    //     user: safeOwner,
    //   });

    //   tokenAddress = event.args.token;
    //   token = await Token.at(tokenAddress);
    //   (await token.name()).should.be.equal(_tokenName);
    // })

    // it('throws if sender tries to sign up twice', async () => {
    //   await assertRevert(hub.signup(_tokenName, { from: safeOwner }));
    // })
  })
});
