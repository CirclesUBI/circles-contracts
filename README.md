# circles-contracts [![Chat Server](https://chat.joincircles.net/api/v1/shield.svg?type=online&name=circles%20chat)](https://chat.joincircles.net) [![Backers](https://opencollective.com/circles/supporters/badge.svg)](https://opencollective.com/circles) [![Follow Circles](https://img.shields.io/twitter/follow/circlesubi.svg?label=follow+circles)](https://twitter.com/CirclesUBI)

This is the initial smart contract implementation for the Circles universal basic income platform.

**Note:** This is not yet intended for deployment in a production system.

Circles is a blockchain-based Universal Basic Income implementation.

[Website](http://www.joincircles.net) // [Whitepaper](https://github.com/CirclesUBI/docs/blob/master/Circles.md) // [Chat](https://chat.joincircles.net)

## Basic design

In general the design philosophy here was to favor restriction of outside interference in token state. The separation of individual token logics into discrete contracts ensures invariants are maintained for the stakeholders (e.g. Circles can never mess with your individual token balance or issuance)

There are two components:

### CirclesToken

This is derived from standard ERC20 implementations, with two main differences: The balance for the "owner" (UBI reciever) is calculated based on the time elapsed since the contract was created, and there is an "exchange" function that allows trusted transitive exchanges.

### CirclesPerson

A CirclesPerson is a user proxy contract that receives UBI (by being attached to a CirclesToken). When queried, it responds as to whether or not an exchange between two tokens is permitted.

## Testing
Please read the [Truffle "writing tests in javascript" page](https://truffleframework.com/docs/truffle/testing/writing-tests-in-javascript).

Requires [node version 8](https://nodejs.org/en/download/)
`npm install` should install all the dev dependencies you need for testing.
`npm test` will re-build the contracts / tests and run all of the tests in the [test](test) directory.

Tests are executed with the help of [Truffle](https://truffleframework.com/docs/truffle/testing/writing-tests-in-javascript) and written in javascript using [Mocha](https://mochajs.org/) with the [Chai assertion library](https://www.chaijs.com/). (We are not currently using, and do not see a need to use Truffle's ability to define tests written in Solidity.)

When you run `npm test` a new local blockchain will be started with ganache-cli (unless you already have one running). The contracts will be deployed and the javascript tests will make transactions to this chain.

Helper functions defined in [test/helpers](test/helpers) provides functionality for more complicated tests such as: reading the event log, or checking for an EVM "revert / throw", or changing the blockstamp times.

### Anatomy of a simple test:
```javascript
const BigNumber = web3.BigNumber;
```
BigNumber is needed to handle Solidity's `int` types
```javascript
require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();
```
We use the Chai assertion library
```javascript
const ERC20DetailedMock = artifacts.require('ERC20DetailedMock');
```
Pull in the contract that you want to test, in this case: [`ERC20DetailedMock.sol`](contracts/mocks/ERC20DetailedMock.sol)
```javascript
contract('ERC20Detailed', function () {
```
Don't know what `contract(` is, and confused about why we aren't using `describe(`? read this thing: [Truffle "writing tests in javascript" page](https://truffleframework.com/docs/truffle/testing/writing-tests-in-javascript)
```javascript
  let detailedERC20 = null;

  const _name = 'My Detailed ERC20';
  const _symbol = 'MDT';
  const _decimals = 18;
```
Just some javascript, do whatever your javascripting heart can dream up.
```javascript
  beforeEach(async function () {
    detailedERC20 = await ERC20DetailedMock.new(_name, _symbol, _decimals);
  });
```
Some stuff that runs before each test. See [Mocha documentatoin](https://mochajs.org/#run-cycle-overview). In this case we are deploying a new `ERC20DetailedMock` contract.
```javascript
  it('has a name', async function () {
    (await detailedERC20.name()).should.be.equal(_name);
  });
```
A test! with a lovely description `'has a name'`, saying that when we submit the transaction `contractDeployedAbove.name()`, we should recieve back `'My Detailed ERC20'`.
