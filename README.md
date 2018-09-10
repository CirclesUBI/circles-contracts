# circles-sketch

This is a [Dappsys](http://dappsys.info)-driven example implementation for the Circles universal basic income platform. It was created with the [dapp](https://dapp.readthedocs.io/en/latest/) development tool, which is required to run the test cases.

**Note:** This is only a sample implementation. It is not intended for deployment in a production system.

## Basic design

In general the design philosophy here was to favor restriction of outside interference in token state. The separation of individual token logics into discrete contracts ensures invariants are maintained for the stakeholders (e.g. Circles can never mess with your individual token balance), while the use of access-controlled `mint` and `burn` functions allows the central business logic adequate control over global token state.

The GroupRules abstraction is sufficiently generic so as to allow for numerous experiments in the future, while maintaining a constant interface for the basic conversion logic.

There are three components:

### CirclesToken

This is derived from the [DSToken](https://dappsys.readthedocs.io/en/latest/ds_token.html) type which allows for access-controlled `mint` and `burn` actions for increasing and decreasing the supply. The `mint` action is called by the token itself whenever a non-constant function is called (e.g. `transfer`). New tokens are created and awarded to the creator of the contract based on how many seconds have elapsed since it was last poked. This value is virtualized, meaning it also is derived and accounted for in constant functions (i.e. `balanceOf` and `totalSupply`) even though they don't actually call the `mint` function.

### TokenManager

The token manager is the ultimate owner of all tokens in this system, meaning it has the authority to control all of their supplies. It keeps a record of which users have established lines of trust to allow token swapping, and it consults this data when a user wants to transitively use the trust graph to send CirclesTokens through the network.

The token manager also controls group tokens, and allows users to convert any CirclesTokens they have into group tokens based on the rules of the group.

### GroupRules

The group rules is an abstract interface that defines `canConvert`, `convertRate`, and `taxRate` functions, as well as `admin` and `vault` members. The `canConvert` function is strictly used as access-control when converting. The `convertRate` is the exchange rate between the group tokens and CirclesTokens being converted. The `taxRate` is another exchange rate for money that is created and sent to the `vault` address, presumably for the betterment of the group. The `admin` address can change the GroupRules associated with a specific group token.

## Open Questions

*Does the `taxRate` + `vault` concept belong in GroupRules?* 

I put it there because I think the Group needs an opportunity to somehow control the global state of their currency, without having total ownership over the token. Is this the right tradeoff? Giving the group total ownership over the token means they could change the `authority` member, potentially removing the TokenManager's ability to `mint` group tokens when converting CirclesTokens.

*Should a user be able to convert another user's CircleTokens?*

I chose to allow this because a user can't control whether a node they trust takes all their specific tokens. It makes sense that they should be able to use what they have to convert, but this means the group rules will have to take the applicant and their token type into account when deciding `canConvert`.
