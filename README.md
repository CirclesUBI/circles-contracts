# Circles Contracts 

<p>
  <a href="https://chat.joincircles.net">
    <img src="https://chat.joincircles.net/api/v1/shield.svg?type=online&name=circles%20chat" alt="Chat Server">
  </a>
  <a href="https://opencollective.com/circles">
    <img src="https://opencollective.com/circles/supporters/badge.svg" alt="Backers">
  </a>
  <a href="https://github.com/CirclesUBI/circles-contracts/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-APGLv3-orange.svg" alt="License">
  </a>
  <a href="https://travis-ci.org/CirclesUBI/circles-contracts">
    <img src="https://api.travis-ci.com/CirclesUBI/circles-contracts.svg?branch=development" alt="Build Status">
  </a>
  <a href="https://twitter.com/CirclesUBI">
    <img src="https://img.shields.io/twitter/follow/circlesubi.svg?label=follow+circles" alt="Follow Circles">
  </a>
</p>


This is the initial smart contract implementation for the Circles universal basic income platform.


[Website](http://www.joincircles.net) // [Whitepaper](https://github.com/CirclesUBI/circles-handbook/blob/master/docs/about/whitepaper.md) // [Chat](https://chat.joincircles.net)

## Basic design

There are several components:

### Token

This is derived from standard ERC20 implementations, with two main differences: The ability to mint UBI to the token owner, and the "hubTransfer" function that allows transitive transfers. Token contracts store the address of the hub that deployed them, and can only transact transitively with tokens from the same hub. Tokens have owners, which can be an external account or any kind of contract - in our deployment, they are [gnosis safes](https://github.com/gnosis/safe-contracts).

### Hub

This is the location of system-wide variables and the trust graph. It has special permissions on all tokens that were deployed through it and have authorized it to perform transitive exchanges. All the parameters in a Hub are immutable and it has no owner.

![contract diagram](/assets/ContractDiagram.jpg)

Illustrated here are some of the main available calls:
 - Signup method of the hub deploys a circles token
 - Safe or external account makes trust connections within the hub with the trust method
 - Users send transitive transactions with the hub, which has special permissions on tokens


## Getting started

Requires [node version 14](https://nodejs.org/en/download/)

Clone down this repo and `npm install`


## Testing

Requires [node version 14](https://nodejs.org/en/download/)
`npm test` will re-build the contracts / tests and run all of the tests in the [test](test) directory.

Tests are executed with the help of [Truffle](https://truffleframework.com/docs/truffle/testing/writing-tests-in-javascript) and written in javascript using [Mocha](https://mochajs.org/) with the [Chai assertion library](https://www.chaijs.com/). 

When you run `npm test` a new local blockchain will be started with ganache-cli (unless you already have one running). The contracts will be deployed and the javascript tests will make transactions to this chain.

Helper functions defined in [test/helpers](test/helpers) provides functionality for more complicated tests such as: reading the event log, or checking for an EVM "revert / throw", or changing the blockstamp times.

## License

GNU Affero General Public License v3.0 `AGPL-3.0`
