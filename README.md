<div align="center">
	<img width="80" src="https://raw.githubusercontent.com/CirclesUBI/.github/main/assets/logo.svg" />
</div>

<h1 align="center">circles-contracts</h1>

<div align="center">
 <strong>
   Smart Contracts for Circles UBI
 </strong>
</div>

<br />

<div align="center">
  <!-- npm -->
  <a href="https://www.npmjs.com/package/circles-contracts">
    <img src="https://img.shields.io/npm/v/circles-contracts?style=flat-square&color=%23f14d48" height="18">
  </a>
  <!-- Licence -->
  <a href="https://github.com/CirclesUBI/circles-contracts/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/CirclesUBI/circles-contracts?style=flat-square&color=%23cc1e66" alt="License" height="18">
  </a>
  <!-- CI status -->
  <a href="https://github.com/CirclesUBI/circles-contracts/actions/workflows/run-tests.yml">
    <img src="https://img.shields.io/github/workflow/status/CirclesUBI/circles-contracts/run-tests?label=tests&style=flat-square&color=%2347cccb" alt="CI Status" height="18">
  </a>
  <!-- Discourse -->
  <a href="https://aboutcircles.com/">
    <img src="https://img.shields.io/discourse/topics?server=https%3A%2F%2Faboutcircles.com%2F&style=flat-square&color=%23faad26" alt="chat" height="18"/>
  </a>
  <!-- Twitter -->
  <a href="https://twitter.com/CirclesUBI">
    <img src="https://img.shields.io/twitter/follow/circlesubi.svg?label=twitter&style=flat-square&color=%23f14d48" alt="Follow Circles" height="18">
  </a>
</div>

<div align="center">
  <h3>
    <a href="https://github.com/CirclesUBI/circles-handbook/blob/master/docs/about/whitepaper.md">
      Whitepaper
    </a>
    <span> | </span>
    <a href="https://handbook.joincircles.net">
      Handbook
    </a>
    <span> | </span>
    <a href="https://github.com/CirclesUBI/circles-contracts/releases">
      Releases
    </a>
    <span> | </span>
    <a href="https://github.com/CirclesUBI/.github/blob/main/CONTRIBUTING.md">
      Contributing
    </a>
  </h3>
</div>

<br/>

Ethereum Smart Contracts for the [`Circles`] UBI system: A decentralised Universal Basic Income platform based on personal currencies.

[`circles`]: https://joincircles.net

## Basic design

There are several components:

### Token contract

This is derived from standard `ERC20` implementations, with two main differences: The ability to mint UBI to the token owner, and the "hubTransfer" function that allows transitive transfers. Token contracts store the address of the hub that deployed them, and can only transact transitively with tokens from the same hub. Tokens have owners, which can be an external account or any kind of contract - in our deployment, they are [`Gnosis Safes`].

[`Gnosis Safes`]: https://github.com/gnosis/safe-contracts

### Hub contract

This is the location of system-wide variables and the trust graph. It has special permissions on all tokens that were deployed through it and have authorized it to perform transitive exchanges. All the parameters in a Hub are immutable and it has no owner.

![contract diagram](/assets/ContractDiagram.jpg)

Illustrated here are some of the main available calls:
 - Signup method of the hub deploys a circles token
 - Safe or external account makes trust connections within the hub with the trust method
 - Users send transitive transactions with the hub, which has special permissions on tokens

## Installation

```bash
npm i circles-contracts
```

Requires [Node version 11](https://nodejs.org/en/download/).

## Development

Install all required dependencies via `npm install`.

`npm test` will re-build the contracts / tests and run all of the tests in the [`test`](test) directory.

Tests are executed with the help of [`Truffle`] and written in javascript using [`Mocha`] with the [`Chai`] assertion library. 

When you run `npm test` a new local blockchain will be started with ganache-cli (unless you already have one running). The contracts will be deployed and the javascript tests will make transactions to this chain.

Helper functions defined in [`test/helpers`](test/helpers) provides functionality for more complicated tests such as: reading the event log, or checking for an EVM "revert / throw", or changing the blockstamp times.

[`Truffle`]: https://truffleframework.com/docs/truffle/testing/writing-tests-in-javascript
[`Mocha`]: https://mochajs.org
[`Chai`]: https://www.chaijs.com

## License

GNU Affero General Public License v3.0 [`AGPL-3.0`]

[`AGPL-3.0`]: LICENSE
