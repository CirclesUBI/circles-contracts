# circles-contracts

This is the initial smart contract implementation for the Circles universal basic income platform.

**Note:** This is not yet intended for deployment in a production system.

## Basic design

In general the design philosophy here was to favor restriction of outside interference in token state. The separation of individual token logics into discrete contracts ensures invariants are maintained for the stakeholders (e.g. Circles can never mess with your individual token balance or issuance)

There are two components:

### CirclesToken

This is derived from standard ERC20 implementations, with two main differences: The balance for the "owner" (UBI reciever) is calculated based on the time elapsed since the contract was created, and there is an "exchange" function that allows trusted transitive exchanges.

### CirclesPerson

A CirclesPerson is a user proxy contract that receives UBI (by being attached to a CirclesToken). When queried, it responds as to whether or not an exchange between two tokens is permitted.

## Testing
Please read the [Truffle "writing tests in javascript" page](https://github.com/CirclesUBI/circles-contracts/tree/master/test/helpers).

Requires [node version 8](https://nodejs.org/en/download/)
`npm install` should install all the dev dependencies you need for testing.
`npm test` will re-build the contracts / tests and run all of the tests in the [test](test) directory.

Tests are executed with the help of [Truffle](https://truffleframework.com/docs/truffle/testing/writing-tests-in-javascript) and written in javascript using [Mocha](https://mochajs.org/) with the [Chai assertion library](https://www.chaijs.com/). (We are not currently using, and do not see a need to use Truffle's ability to define tests written in Solidity.)

When you run `npm test` a new local blockchain will be started with ganache-cli (unless you already have one running). The contracts will be deployed and the javascript tests will make transactions to this chain.

Helper functions defined in [test/helpers](test/helpers) provides functionality for more complicated tests such as: reading the event log, or checking for an EVM "revert / throw", or changing the blockstamp times.
