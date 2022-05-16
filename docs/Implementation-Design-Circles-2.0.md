# Implementation Design for Circles 2.0

|              |                          |
| ------------ | ------------------------ |
| **Designer** | Bitspossessed Collective |
| **Status**   | Draft                    |
| **Date**     | 15.03.22                 |
| **Version**  | 0.0.1                    |

## How to use this document

Implementation design for solving issues related to circles.garden. When necessary concepts will be described. However, a high level understanding of the system is required and necessary to review this document.

### Status:

- **Draft**: the document is still on the works
- **Reviewed**: this document has been reviewed by the reviewers listed in the reviewers list.
- **Released**: this document has been released and approved and will move towards implementation.

### Versions:

**0.0.x:** minor changes
**0.x.0:** reviews
**x.0.0:** released

## Introduction

Given the [Earth Circle IP 1 - Circles 2.0 Architecture](https://aboutcircles.com/t/earth-circle-ip-1-circles-2-0-architecture/428) where some improvements affecting the Circles smart contracts are proposed, we present our conclusions in this document as well as the timeline plan, and the technical implementation details.

## Improved features overview

The following is based on conversations within the Bitspossessed, including discussions with Andreas and Sarah (the developers of the first circles system) and with Julio from the Circles Coop.

- **Trust limits**:

  - Remove trust limits functionality.
  - Keep binary trust (0% vs 100%), and not having the sendLimit in the hubTransfers.
  - The new HUB2.0 contract will have new implementations of `transferThrough()` and `checkSendLimit()`, which should ignore trust limits (and only interpret binary trust).
  - We can use the pathfinder to improve the health of the network and compensate for some problems we tried to solve with trust limits before.

- **Separate the Hub into 2 contracts**:

  - We are in favor of separating Trust functionality in a different contract (called TRUST), although we don't see it as necessary.
  - The TRUST contract should in that case be very simple.
  - We think that it might not be necessary to create a new TRUST2.0 contract since there is the old HUB that already stores all the trust relationships and `trust()` method.
    - If trust rules (besides trust limits) are not going to change, we think a new contract is not needed. In the transfer contract we can interpret any trust limit different than 0 as 100%.
  - Or if we have a new TRUST contract, there are 2 options:
    1. Migrate trusts from the old HUB (HUB1.0) to the new TRUST or HUB2.0 contract
    2. Keeping trust in HUB1.0
       - in HUB2.0 there would be new implementation `signup()` method, and new `userToToken` and `tokenToUser` mappings
       - in TRUST contract we would just call `trust()` and `checkTrust()` in HUB1.0 with the trust limit = 100
  - We have to discuss further if we prefer migrating trusts, or just read /write in HUB1.0. But we are inclined to not add extra unnecessary steps that may lead to errors or bugs in the migration of the Web of Trust.

- **Dead-man-switch/liveness trigger**:

  - Make the `update()` method private so that only the token owner can call it.
  - Once the update method is private the account is automatically not minting until the user calls `update()` again and if that is indefinite it is essentially working like the Dead-man-switch/Liveness trigger, in that it stops UBI minting.
  - Thus we are in favor of removing it all together because there's no longer a use case.

- **Inflation period**:

  - We are ok with changing it or not. But we don't feel it is as important and we would deprioritize it if necessary.
  - It is only two variables to change.

- **FollowTrust**:
  - The implementation of this creates a lot of complexity in asking "does this safe trust this token?"
  - Circles is already complex in terms of transitive transfer queries and this only makes it worse and the system would become more thorny.
  - It is not necessary to implement this on the contract level. A "copy" trust can easily be implemented on top of contract level with the behaviour: you trust who the other user trusts at a given point of time instead of subscribing to someone elses trust which is also vulnerable in terms of network dynamics, giving a lot of power to some users.

## Time-line for updating smart contracts Circles 2.0

### February

- [x] discussion: on what to include (bits and land)
- [x] discussion: on what to include (bits internal including Sarah Friend)

### March

- [x] post: update from bits in forum on 2.0 (bits)
- [ ] admin: set up a shared place for documenting agreements and decisions in git (bits)
- [ ] discussion: group currency mechanics expectation (coop and bits)
- [ ] implement: PR for removal of dead man's switch and private update method (bits)
- [ ] post: mapping out different balance migration option (bits)
- [ ] discussion: migrating options and user communication (bits and coop)
- [ ] discussion: migrating balances and trust (bits and land)

### April

- [ ] discussion: internal technical overview for group currencies (bits internal including Sarah Friend)
- [ ] post: sharing group currency input (bits)
- [ ] implement: PR for removal of trust limits (bits or land)
- [ ] implement: [optional in opinion of bits] PR for shorter inflation rate intervals (land)
- [ ] implement: follow trust

### May

- [ ] decision: review / accept contract updates (bits, land)
- [ ] decision: decide what migration path to choose for balances (bits, land, coop)
- [ ] decision: decide what migration path to choose for trust (bits, land, coop)
- [ ] discussion: come up with a technical migration plan and time-line (bits, land)
- [ ] decision: technical migration details (bits and land)

### June

- [ ] discussion: group currency input (bits, land, coop)
- [ ] implement: group currency updates (?)
- [ ] implement: prepare migration (needs to be broken down) (bits and land)

### July

- [ ] implement: prepare migration
- [ ] implement: group currency updates (?)

### August

- [ ] implement: prepare migration

### September

- [ ] implement: MIGRATION
