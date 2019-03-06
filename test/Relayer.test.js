// https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/test/token/ERC20/ERC20.test.js

const { assertRevert } = require('./helpers/assertRevert');
const expectEvent = require('./helpers/expectEvent');

// const ERC20Mock = artifacts.require('ERC20Mock');
const Hub = artifacts.require('Hub');
const Token = artifacts.require('Token');

const BigNumber = web3.utils.BN;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('ERC20', function ([_, owner, recipient, anotherAccount, systemOwner]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  let hub = null;
  let token = null;

  const _issuance = new BigNumber(1736111111111111);
  const _demurrage = new BigNumber(0);
  const _decimals = new BigNumber(18);
  const _symbol = 'CRC';
  const _limitEpoch = new BigNumber(3600);
  const _tokenName = 'MyCoin';
  const _initialPayout = new BigNumber(100);

  // before(async () => {
  //   hub = await Hub.new(systemOwner, _issuance, _demurrage, _decimals, _symbol, _limitEpoch);
  // })

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, _issuance, _demurrage, _decimals, _symbol, _limitEpoch, _initialPayout);
    const signup = await hub.signup(_tokenName, { from: owner });// owner, 100);
    token = await Token.at(signup.logs[0].args.token);
  });

  describe('name is correctly set', () => {
    it('returns the total amount of tokens', async () => {
      (await token.totalSupply()).should.be.bignumber.equal(new BigNumber(100));
    });
  });
});
