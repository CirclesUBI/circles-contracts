# Circles Contracts [![Chat Server](https://chat.joincircles.net/api/v1/shield.svg?type=online&name=circles%20chat)](https://chat.joincircles.net) [![Backers](https://opencollective.com/circles/supporters/badge.svg)](https://opencollective.com/circles) [![Follow Circles](https://img.shields.io/twitter/follow/circlesubi.svg?label=follow+circles)](https://twitter.com/CirclesUBI) [![Circles License](https://img.shields.io/badge/license-APGLv3-orange.svg)](https://github.com/CirclesUBI/circles-contracts/blob/master/LICENSE) [![Build Status](https://travis-ci.org/CirclesUBI/circles-contracts.svg?branch=master)](https://travis-ci.org/CirclesUBI/circles-contracts)

This is the initial smart contract implementation for the Circles universal basic income platform.

**Note:** This is not yet intended for deployment in a production system.

Circles is a blockchain-based Universal Basic Income implementation.

[Website](http://www.joincircles.net) // [Whitepaper](https://github.com/CirclesUBI/docs/blob/master/Circles.md) // [Chat](https://chat.joincircles.net)

## Basic design

In general the design philosophy here was to favor restriction of outside interference in token state. The separation of individual token logics into discrete contracts allows stakeholders to migrate their token to different circles-like systems.

There are several components:

### Token

This is derived from standard ERC20 implementations, with two main differences: The balance for the "owner" (UBI reciever) is calculated based on the time elapsed since the contract was created, and there is an "hubTransfer" function that allows trusted transitive exchanges. Tokens belong to only one hub at a time, and can only transact transitively with tokens from the same hub. `Owner` can migrate their token to a new hub, but doing so will require rebuilding the trust graph.

### Hub

This is the location of system-wide variables, and the trust graph. It has special permissions on all tokens that have authorized it to perform transitive exchanges. Hub has an owner, which should at least be a multisig, but can easily be another contract. 

### Organization

This is wallet that transacts in the circles system but does not receive a universal basic income. 

### TxRelay

A meta-transaction relayer to pay users' gas fees for the purposes of the circles pilot. Eventually, this functionality will be opened to other entities in the circles system.

## Getting started

Requires [node version 10](https://nodejs.org/en/download/) and [Truffle 5](https://github.com/trufflesuite/truffle) installed globally: `npm install -g truffle`

Clone down this repo and `npm install`

With ganache running (`npm run ganache`), in a new console window, `truffle compile` then `truffle migrate`

**Note:** This is a work in progress and this should be done only for contribution and exploration purposes.

## Testing
Please read the [Truffle "writing tests in javascript" page](https://truffleframework.com/docs/truffle/testing/writing-tests-in-javascript).

Requires [node version 10](https://nodejs.org/en/download/)
`npm test` will re-build the contracts / tests and run all of the tests in the [test](test) directory.

Tests are executed with the help of [Truffle](https://truffleframework.com/docs/truffle/testing/writing-tests-in-javascript) and written in javascript using [Mocha](https://mochajs.org/) with the [Chai assertion library](https://www.chaijs.com/). (We are not currently using, and do not see a need to use Truffle's ability to define tests written in Solidity.)

When you run `npm test` a new local blockchain will be started with ganache-cli (unless you already have one running). The contracts will be deployed and the javascript tests will make transactions to this chain.

Helper functions defined in [test/helpers](test/helpers) provides functionality for more complicated tests such as: reading the event log, or checking for an EVM "revert / throw", or changing the blockstamp times.

### Anatomy of a simple test:
```javascript
const BigNumber = web3.BN;
```
BN is needed to handle Solidity's `int` types
```javascript
require('chai')
  .use(require('chai-bn')(BigNumber))
  .should();
```
We use the Chai assertion library
```javascript
const ERC20 = artifacts.require('ERC20');
```
Pull in the contract that you want to test, in this case: [`ERC20.sol`](contracts/mocks/ERC20.sol)
```javascript
contract('ERC20', function () {
```
Don't know what `contract(` is, and confused about why we aren't using `describe(`? read this thing: [Truffle "writing tests in javascript" page](https://truffleframework.com/docs/truffle/testing/writing-tests-in-javascript)
```javascript
  let ERC20 = null;

  const _name = 'My ERC20';
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
