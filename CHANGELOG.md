# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.3.2] - 2023-06-07

### Fixed

- Update to node16 [#189](https://github.com/CirclesUBI/circles-contracts/pull/189)
- Update dependencies [#181](https://github.com/CirclesUBI/circles-contracts/pull/181) [#189](https://github.com/CirclesUBI/circles-contracts/pull/189)

## [3.3.1] - 2023-03-20

### Added

- Save contract addresses in a file for the pathfinder2 service [#180](https://github.com/CirclesUBI/circles-contracts/pull/180)

### Fixed

- Update dependencies
- Update GH Actions dependencies [#183](https://github.com/CirclesUBI/circles-contracts/pull/183)

### Changed

- Change sokol with chiado in truffle config [#176](https://github.com/CirclesUBI/circles-contracts/pull/176)

## [3.2.0] - 2022-11-29

### Added

- Add GnosisSafeL2 contract [#170](https://github.com/CirclesUBI/circles-contracts/pull/170)

## [3.1.0] - 2022-11-22

### Changed

- Add the deployment script for local development, with the `GnosisSafe`, `ProxyFactory`, `MultiSend`, `MultiSendCallOnly`, and `DefaultCallbackHandler` contracts from `@gnosis.pm/safe-contracts` package.
- Use latest version of the contracts for the tests
- [Update format data EIP712](d8792da)
- [Update length revert message from 67 to 96](5810aa8)
- [GS13 update in SafeGasTx vakue from 0 to 1](7b35db0)
- [Update paymentToken gasCost value from 87269 to 89645](66554d2)
- Update dependencies

## [3.0.1] - 2022-07-01

### Fixed

- Add built contracts

## [3.0.0] - 2022-07-01

### Changed

- Add @circles scope to package name

## [2.3.2] - 2022-07-01

### Fixed

- Update dependencies [#158](https://github.com/CirclesUBI/circles-contracts/pull/158)
