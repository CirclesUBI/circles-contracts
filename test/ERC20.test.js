// https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/test/token/ERC20/ERC20.test.js

const { assertRevert } = require('./helpers/assertRevert');
const expectEvent = require('./helpers/expectEvent');

// const ERC20Mock = artifacts.require('ERC20Mock');
const Hub = artifacts.require('Hub');
const Token = artifacts.require('Token');

const BigNumber = web3.utils.BN;

require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();

contract('ERC20', function ([_, owner, recipient, anotherAccount, systemOwner]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  let hub = null;
  let token = null;

  const _issuance = new BigNumber(1736111111111111);
  const _demurrage = new BigNumber(0);
  const _symbol = 'CRC';
  const _tokenName = 'MyCoin';
  const _initialPayout = new BigNumber(100);

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, _issuance, _demurrage, _symbol, _initialPayout);
    const signup = await hub.signup(_tokenName, { from: owner });
    token = await Token.at(signup.logs[0].args.token);
  });

  describe('total supply', () => {
    it('returns the total amount of tokens', async () => {
      (await token.totalSupply()).should.be.bignumber.equal(new BigNumber(100));
    });
  });

  describe('decimals', () => {
    it('tokens always have 18 decimals', async () => {
      (await token.decimals()).should.be.bignumber.equal(new BigNumber(18));
    });
  });

  describe('balanceOf', () => {
    describe('when the requested account has no tokens', () => {
      it('returns zero', async () => {
        (await token.balanceOf(anotherAccount)).should.be.bignumber.equal(new BigNumber(0));
      });
    });

    describe('when the requested account has some tokens', () => {
      it('returns the total amount of tokens', async () => {
        (await token.balanceOf(owner)).should.be.bignumber.equal(new BigNumber(100));
      });
    });
  });

  describe('transfer', () => {
    describe('when the recipient is not the zero address', () => {
      const to = recipient;

      describe('when the sender does not have enough balance', () => {
        const amount = new BigNumber(101);

        it('reverts', async () => {
          await assertRevert(token.transfer(to, amount, { from: owner }));
        });
      });

      describe('when the sender has enough balance', () => {
        const amount = new BigNumber(100);

        it('transfers the requested amount', async () => {
          await token.transfer(to, amount, { from: owner });

          (await token.balanceOf(owner)).should.be.bignumber.equal(new BigNumber(0));

          (await token.balanceOf(to)).should.be.bignumber.equal(amount);
        });

        it('emits a transfer event', async () => {
          const { logs } = await token.transfer(to, amount, { from: owner });

          const event = expectEvent.inLogs(logs, 'Transfer', {
            from: owner,
            to: to,
          });

          event.args.value.should.be.bignumber.equal(amount);
        });
      });
    });

    describe('when the recipient is the zero address', () => {
      const to = ZERO_ADDRESS;
      it('reverts', async () => {
        await assertRevert(token.transfer(to, 100, { from: owner }));
      });

    });
  });

  describe('approve', () => {
    describe('when the spender is not the zero address', () => {
      const spender = recipient;

      describe('when the sender has enough balance', () => {
        const amount = new BigNumber(100);

        it('emits an approval event', async () => {
          const { logs } = await token.approve(spender, amount, { from: owner });

          logs.length.should.equal(1);
          logs[0].event.should.equal('Approval');
          logs[0].args.owner.should.equal(owner);
          logs[0].args.spender.should.equal(spender);
          logs[0].args.value.should.be.bignumber.equal(amount);
        });

        describe('when there was no approved amount before', () => {
          it('approves the requested amount', async () => {
            await token.approve(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', () => {
          beforeEach(async () => {
            await token.approve(spender, 1, { from: owner });
          });

          it('approves the requested amount and replaces the previous one', async () => {
            await token.approve(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });
      });

      describe('when the sender does not have enough balance', () => {
        const amount = new BigNumber(101);

        it('emits an approval event', async () => {
          const { logs } = await token.approve(spender, amount, { from: owner });

          logs.length.should.equal(1);
          logs[0].event.should.equal('Approval');
          logs[0].args.owner.should.equal(owner);
          logs[0].args.spender.should.equal(spender);
          logs[0].args.value.should.be.bignumber.equal(amount);
        });

        describe('when there was no approved amount before', () => {
          it('approves the requested amount', async () => {
            await token.approve(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', () => {
          beforeEach(async () => {
            await token.approve(spender, 1, { from: owner });
          });

          it('approves the requested amount and replaces the previous one', async () => {
            await token.approve(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });
      });
    });

    describe('when the spender is the zero address', () => {
      const amount = new BigNumber(100);
      const spender = ZERO_ADDRESS;

      it('reverts', async () => {
        await assertRevert(token.approve(spender, amount, { from: owner }));
      });

    });
  });

  describe('transfer from', () => {
    const spender = recipient;

    describe('when the recipient is not the zero address', () => {
      const to = anotherAccount;

      describe('when the spender has enough approved balance', () => {
        beforeEach(async () => {
          await token.approve(spender, 100, { from: owner });
        });

        describe('when the owner has enough balance', () => {
          const amount = new BigNumber(100);

          it('transfers the requested amount', async () => {
            await token.transferFrom(owner, to, amount, { from: spender });

            (await token.balanceOf(owner)).should.be.bignumber.equal(new BigNumber(0));

            (await token.balanceOf(to)).should.be.bignumber.equal(amount);
          });

          it('decreases the spender allowance', async () => {
            await token.transferFrom(owner, to, amount, { from: spender });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(new BigNumber(0));
          });

          it('emits a transfer event', async () => {
            const { logs } = await token.transferFrom(owner, to, amount, { from: spender });

            logs.length.should.equal(2);
            logs[0].event.should.equal('Transfer');
            logs[0].args.from.should.equal(owner);
            logs[0].args.to.should.equal(to);
            logs[0].args.value.should.be.bignumber.equal(amount);
            logs[1].event.should.equal('Approval');
            logs[1].args.owner.should.equal(owner);
            logs[1].args.spender.should.equal(spender);
            logs[1].args.value.should.be.bignumber.equal(new BigNumber(0));
          });
        });

        describe('when the owner does not have enough balance', () => {
          const amount = new BigNumber(101);

          it('reverts', async () => {
            await assertRevert(token.transferFrom(owner, to, amount, { from: spender }));
          });
        });
      });

      describe('when the spender does not have enough approved balance', () => {
        beforeEach(async () => {
          await token.approve(spender, 99, { from: owner });
        });

        describe('when the owner has enough balance', () => {
          const amount = new BigNumber(100);

          it('reverts', async () => {
            await assertRevert(token.transferFrom(owner, to, amount, { from: spender }));
          });
        });

        describe('when the owner does not have enough balance', () => {
          const amount = new BigNumber(101);

          it('reverts', async () => {
            await assertRevert(token.transferFrom(owner, to, amount, { from: spender }));
          });
        });
      });
    });

    describe('when the recipient is the zero address', () => {
      const amount = new BigNumber(100);
      const to = ZERO_ADDRESS;

      beforeEach(async () => {
        await token.approve(spender, amount, { from: owner });
      });
    });
   });

  describe('decrease allowance', () => {
    describe('when the spender is not the zero address', () => {
      const spender = recipient;

      function shouldDecreaseApproval (amount) {
        describe('when there was no approved amount before', () => {
          it('reverts', async () => {
            await assertRevert(token.decreaseAllowance(spender, amount, { from: owner }));
          });
        });

        describe('when the spender had an approved amount', () => {
          const approvedAmount = amount;

          beforeEach(async function () {
            ({ logs: this.logs } = await token.approve(spender, approvedAmount, { from: owner }));
          });

          it('emits an approval event', async () => {
            const { logs } = await token.decreaseAllowance(spender, approvedAmount, { from: owner });

            logs.length.should.equal(1);
            logs[0].event.should.equal('Approval');
            logs[0].args.owner.should.equal(owner);
            logs[0].args.spender.should.equal(spender);
            logs[0].args.value.should.be.bignumber.equal(new BigNumber(0));
          });

          it('decreases the spender allowance subtracting the requested amount', async () => {
            await token.decreaseAllowance(spender, approvedAmount - 1, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(new BigNumber(1));
          });

          it('sets the allowance to zero when all allowance is removed', async () => {
            await token.decreaseAllowance(spender, approvedAmount, { from: owner });
            (await token.allowance(owner, spender)).should.be.bignumber.equal(new BigNumber(0));
          });

          it('reverts when more than the full allowance is removed', async function () {
            await assertRevert(token.decreaseAllowance(spender, approvedAmount + 1, { from: owner }));
          });
        });
      }

      describe('when the sender has enough balance', function () {
        const amount = new BigNumber(100);

        shouldDecreaseApproval(amount);
      });

      describe('when the sender does not have enough balance', function () {
        const amount = new BigNumber(101);

        shouldDecreaseApproval(amount);
      });
    });

    describe('when the spender is the zero address', function () {
      const amount = new BigNumber(100);
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await assertRevert(token.decreaseAllowance(spender, amount, { from: owner }));
      });
    });
  });

  describe('increase allowance', () => {
    const amount = new BigNumber(100);

    describe('when the spender is not the zero address', () => {
      const spender = recipient;

      describe('when the sender has enough balance', () => {
        it('emits an approval event', async () => {
          const { logs } = await token.increaseAllowance(spender, amount, { from: owner });

          logs.length.should.equal(1);
          logs[0].event.should.equal('Approval');
          logs[0].args.owner.should.equal(owner);
          logs[0].args.spender.should.equal(spender);
          logs[0].args.value.should.be.bignumber.equal(amount);
        });

        describe('when there was no approved amount before', () => {
          it('approves the requested amount', async () => {
            await token.increaseAllowance(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', () => {
          beforeEach(async function () {
            await token.approve(spender, 1, { from: owner });
          });

          it('increases the spender allowance adding the requested amount', async () => {
            await token.increaseAllowance(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount.add(new BigNumber(1)));
          });
        });
      });

      describe('when the sender does not have enough balance', () => {
        const amount = new BigNumber(101);

        it('emits an approval event', async () => {
          const { logs } = await token.increaseAllowance(spender, amount, { from: owner });

          logs.length.should.equal(1);
          logs[0].event.should.equal('Approval');
          logs[0].args.owner.should.equal(owner);
          logs[0].args.spender.should.equal(spender);
          logs[0].args.value.should.be.bignumber.equal(amount);
        });

        describe('when there was no approved amount before', () => {
          it('approves the requested amount', async function () {
            await token.increaseAllowance(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', () => {
          beforeEach(async function () {
            await token.approve(spender, 1, { from: owner });
          });

          it('increases the spender allowance adding the requested amount', async () => {
            await token.increaseAllowance(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount.add(new BigNumber(1)));
          });
        });
      });
    });

    describe('when the spender is the zero address', () => {
      const spender = ZERO_ADDRESS;

      it('reverts', async () => {
        await assertRevert(token.increaseAllowance(spender, amount, { from: owner }));
      });
    });
  });

});
