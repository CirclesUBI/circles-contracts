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
