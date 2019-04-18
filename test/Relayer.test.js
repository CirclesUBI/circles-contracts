const { assertRevert } = require('./helpers/assertRevert');
const expectEvent = require('./helpers/expectEvent');

const Hub = artifacts.require('Hub');
const Relayer = artifacts.require('TxRelay');

const BigNumber = web3.utils.BN;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('Hub', ([_, systemOwner, attacker, relayer, tokenQwner]) => {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
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

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, _issuance, _demurrage, _decimals, _symbol, _limitEpoch, _initialPayout);
    relayer = await Relayer.new(systemOwner, _issuance, _demurrage, _decimals, _symbol, _limitEpoch, _initialPayout);
    // const signup = await hub.signup(_tokenName, { from: owner });
    // token = await Token.at(signup.logs[0].args.token);
  });

  describe('correctly relays a signup', () => {
    before(async () => {
      
    })

    it('returns the total amount of tokens', async () => {
      (await token.totalSupply()).should.be.bignumber.equal(new BigNumber(100));
    });
  });
});
