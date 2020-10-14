// SPDX-License-Identifier: AGPL
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Token.sol";

contract Hub {
    using SafeMath for uint256;

    uint256 public immutable inflation; // the inflation rate expressed as 1 + percentage inflation, aka 7% inflation is 107
    uint256 public immutable divisor; // the largest power of 10 the inflation rate can be divided by
    uint256 public immutable period; // the amount of sections between inflation steps
    string public symbol;
    string public name;
    uint256 public immutable signupBonus; // a one-time payout made immediately on signup
    uint256 public immutable initialIssuance; // the starting payout per second, this gets inflated by the inflation rate
    uint256 public immutable deployedAt; // the timestamp this contract was deployed at
    uint256 public immutable timeout; // longest a token can go without a ubi payout before it gets deactivated

    mapping (address => Token) public userToToken;
    mapping (address => address) public tokenToUser;
    mapping (address => bool) public organizations;
    mapping (address => mapping (address => uint256)) public limits;

    event Signup(address indexed user, address token);
    event OrganizationSignup(address indexed organization);
    event Trust(address indexed canSendTo, address indexed user, uint256 limit);
    event HubTransfer(address indexed from, address indexed to, uint256 amount);

    // some data types used for validating transitive transfers
    struct transferValidator {
        bool seen;
        uint256 sent;
        uint256 received;
    }
    mapping (address => transferValidator) public validation;
    address[] public seen;

    constructor(
        uint256 _inflation,
        uint256 _period,
        string memory _symbol,
        string memory _name,
        uint256 _signupBonus,
        uint256 _initialIssuance,
        uint256 _timeout
    ) {
        inflation = _inflation;
        divisor = findDivisor(_inflation);
        period = _period;
        symbol = _symbol;
        name = _name;
        signupBonus = _signupBonus;
        initialIssuance = _initialIssuance;
        deployedAt = block.timestamp;
        timeout = _timeout;
    }

    /// @notice calculates the correct divisor for the given inflation rate
    /// @dev the divisor is used to maintain precision when doing math with percentages
    /// @param _inf the inflation rate
    /// @return the largest power of ten the inflation rate can be divided by
    function findDivisor(uint256 _inf) internal pure returns (uint256) {
        uint256 iter = 0;
        while (_inf.div(pow(10, iter)) > 9) {
            iter += 1;
        }
        return pow(10, iter);
    }

    /// @notice helper function for finding the amount of inflation periods since this hub was deployed
    /// @return the amount of periods since hub was deployed
    function periods() public view returns (uint256) {
        return (block.timestamp.sub(deployedAt)).div(period);
    }

    /// @notice calculates the current issuance rate per second
    /// @dev current issuance is the initial issuance inflated by the amount of inflation periods since the hub was deployed
    /// @return current issuance rate
    function issuance() public view returns (uint256) {
        return inflate(initialIssuance, periods());
    }

    /// @notice finds the inflation rate at a given inflation period
    /// @param _periods the step to calculate the issuance rate at
    /// @return inflation rate as of the given period
    function issuanceByStep(uint256 _periods) public view returns (uint256) {
        return inflate(initialIssuance, _periods);
    }

    /// @notice find the current issuance rate for any initial issuance and amount of periods
    /// @dev this is basically the calculation for compound interest, with some adjustments because of integer math
    /// @param _initial the starting issuance rate
    /// @param _periods the step to calculate the issuance rate as of
    /// @return initial issuance rate as if interest (inflation) has been compounded period times
    function inflate(uint256 _initial, uint256 _periods) public view returns (uint256) {
        // this returns P * (1 + r) ** t - which is a the formula for compound interest if 
        // interest is compounded only once per period
        // in our case, currentIssuanceRate = initialIssuance * (inflation) ** periods
        uint256 q = pow(inflation, _periods);
        uint256 d = pow(divisor, _periods);
        return (_initial.mul(q)).div(d);
    }

    /// @notice signup to this circles hub - create a circles token and join the trust graph
    /// @dev signup is permanent, there's no way to unsignup
    function signup() public {
        // signup can only be called once
        require(address(userToToken[msg.sender]) == address(0), "You can't sign up twice");
        // organizations cannot sign up for a token
        require(organizations[msg.sender] == false, "Organizations cannot signup as normal users");

        Token token = new Token(msg.sender);
        userToToken[msg.sender] = token;
        tokenToUser[address(token)] = msg.sender;
        // every user must trust themselves with a weight of 100
        // this is so that all users accept their own token at all times
        _trust(msg.sender, 100);

        emit Signup(msg.sender, address(token));
    }

    /// @notice register an organization address with the hub and join the trust graph
    /// @dev signup is permanent for organizations too, there's no way to unsignup
    function organizationSignup() public {
        // can't register as an organization if you have a token
        require(address(userToToken[msg.sender]) == address(0), "Normal users cannot signup as organizations");
        // can't register as an organization twice
        require(organizations[msg.sender] == false, "You can't sign up as an organization twice");

        organizations[msg.sender] = true;

        emit OrganizationSignup(msg.sender);
    }

    /// @notice trust a user, calling this means you're able to receive tokens from this user transitively
    /// @dev the trust graph is weighted and directed
    /// @param user the user to be trusted
    /// @param limit the amount this user is trusted, as a percentage of 100
    function trust(address user, uint limit) public {
        // only users who have signed up as tokens or organizations can enter the trust graph
        require(address(userToToken[msg.sender]) != address(0) || organizations[msg.sender], "You can only trust people after you've signed up!");
        // you must continue to trust yourself 100%
        require(msg.sender != user, "You can't untrust yourself");
        // organizations can't receive trust since they don't have their own token (ie. there's nothing to trust)
        require(organizations[user] == false, "You can't trust an organization");
        // must a percentage
        require(limit <= 100, "Limit must be a percentage out of 100");
        _trust(user, limit);
    }

    /// @dev used internally in both the trust function and signup
    /// @param user the user to be trusted
    /// @param limit the amount this user is trusted, as a percentage of 100
    function _trust(address user, uint limit) internal {
        limits[msg.sender][user] = limit;
        emit Trust(msg.sender, user, limit);
    }

    /// @dev this is an implementation of exponentiation by squares
    /// @param base the base to be used in the calculation
    /// @param exponent the exponent to be used in the calculation
    /// @return the result of the calculation
    function pow(uint256 base, uint256 exponent) public pure returns (uint256) {
        if (base == 0) {
            return 0;
        }
        if (exponent == 0) {
            return 1;
        }
        if (exponent == 1) {
            return base;
        }
        uint256 y = 1;
        while(exponent > 1) {
            if(exponent.mod(2) == 0) {
                base = base.mul(base);
                exponent = exponent.div(2);
            } else {
                y = base.mul(y);
                base = base.mul(base);
                exponent = (exponent.sub(1)).div(2);
            }
        }
        return base.mul(y);
    }

    /// @notice finds the maximum amount of a specific token that can be sent between two users
    /// @dev the goal of this function is to always return a sensible number, it's used to validate transfer throughs, and also heavily in the graph/pathfinding services
    /// @param tokenOwner the safe/owner that the token was minted to
    /// @param src the sender of the tokens
    /// @param dest the recipient of the tokens
    /// @return the amount of tokenowner's token src can send to dest
    function checkSendLimit(address tokenOwner, address src, address dest) public view returns (uint256) {

        // there is no trust
        if (limits[dest][tokenOwner] == 0) {
            return 0;
        }

        // if dest hasn't signed up, they cannot trust anyone
        if (address(userToToken[dest]) == address(0) && !organizations[dest] ) {
            return 0;
        }

        //if the token doesn't exist, it can't be sent/accepted
        if (address(userToToken[tokenOwner]) == address(0)) {
             return 0;
        }

        uint256 srcBalance = userToToken[tokenOwner].balanceOf(src);

        // if sending dest's token to dest, src can send 100% of their holdings
        if (tokenOwner == dest || organizations[dest]) {
            return srcBalance;
        }

        // find the amount dest already has of the token that's being sent
        uint256 destBalance = userToToken[tokenOwner].balanceOf(dest);
        
        // find the maximum possible amount based on dest's trust limit for this token
        uint256 max = (userToToken[dest].balanceOf(dest).mul(limits[dest][tokenOwner])).div(100);
        
        // if trustLimit has already been overriden by a direct transfer, nothing more can be sent
        if (max < destBalance) return 0;
        
        // return the max amount dest is willing to hold minus the amount they already have
        return max.sub(destBalance);
    }

    /// @dev builds the validation data structures, called for each transaction step of a transtive transactions
    /// @param src the sender of a single transaction step
    /// @param dest the recipient of a single transaction step
    /// @param wad the amount being passed along a single transaction step
    function buildValidationData(address src, address dest, uint wad) internal {
        // the validation mapping has this format
        // { address: {
        //     seen: whether this user is part of the transaction,
        //     sent: total amount sent by this user,
        //     received: total amount received by this user,
        //    }
        // }
        if (validation[src].seen != false) {
            // if we have seen the addresses, increment their sent amounts
            validation[src].sent = validation[src].sent.add(wad);
        } else {
            // if we haven't, add them to the validation mapping
            validation[src].seen = true;
            validation[src].sent = wad;
            seen.push(src);
        }
        if (validation[dest].seen != false) {
            // if we have seen the addresses, increment their sent amounts
            validation[dest].received = validation[dest].received.add(wad);
        } else {
            // if we haven't, add them to the validation mapping
            validation[dest].seen = true;
            validation[dest].received = wad; 
            seen.push(dest);   
        }
    }

    /// @dev performs the validation for an attempted transitive transfer
    /// @param steps the number of steps in the transitive transaction
    function validateTransferThrough(uint256 steps) internal {
        // a valid path has only one real sender and receiver
        address src;
        address dest;
        // iterate through the array of all the addresses that were part of the transaction data
        for (uint i = 0; i < seen.length; i++) {
            transferValidator memory curr = validation[seen[i]];
            // if the address sent more than they received, they are the sender
            if (curr.sent > curr.received) {
                // if we've already found a sender, transaction is invalid
                require(src == address(0), "Path sends from more than one src");
                // the real token sender must also be the transaction sender
                require(seen[i] == msg.sender, "Path doesn't send from transaction sender");
                src = seen[i];
            }
            // if the address received more than they sent, they are the recipient
            if (curr.received > curr.sent) {
                // if we've already found a recipient, transaction is invalid
                require(dest == address(0), "Path sends to more than one dest");
                dest = seen[i];
            }
        }
        // a valid path has both a sender and a recipient
        require(src != address(0), "Transaction must have a src");
        require(dest != address(0), "Transaction must have a dest");
        // sender should not recieve, recipient should not send
        // by this point in the code, we should have one src and one dest and no one else's balance should change
        require(validation[src].received == 0, "Sender is receiving");
        require(validation[dest].sent == 0, "Recipient is sending");
        // the total amounts sent and received by sender and recipient should match
        require(validation[src].sent == validation[dest].received, "Unequal sent and received amounts");
        // the maximum amount of addresses we should see is one more than steps in the path
        require(seen.length <= steps + 1, "Seen too many addresses");
        emit HubTransfer(src, dest, validation[src].sent);
        // clean up the validation datastructures
        for (uint i = seen.length; i >= 1; i--) {
            validation[seen[i-1]].sent = 0;
            validation[seen[i-1]].received = 0;
            validation[seen[i-1]].seen = false;
            seen.pop();
        }
        // sanity check that we cleaned everything up correctly
        require(seen.length == 0, "Seen should be empty");
    }

    /// @notice walks through tokenOwners, srcs, dests, and amounts array and executes transtive transfer
    /// @dev tokenOwners[0], srcs[0], dests[0], and wads[0] constitute a transaction step
    /// @param tokenOwners the owner of the tokens being sent in each transaction step
    /// @param srcs the sender of each transaction step
    /// @param dests the recipient of each transaction step
    /// @param wads the amount for each transaction step
    function transferThrough(
        address[] memory tokenOwners,
        address[] memory srcs,
        address[] memory dests,
        uint[] memory wads
    ) public {
        // all the arrays must be the same length
        require(dests.length == tokenOwners.length, "Tokens array length must equal dests array");
        require(srcs.length == tokenOwners.length, "Tokens array length must equal srcs array");
        require(wads.length == tokenOwners.length, "Tokens array length must equal amounts array");
        for (uint i = 0; i < srcs.length; i++) {
            address src = srcs[i];
            address dest = dests[i];
            address token = tokenOwners[i];
            uint256 wad = wads[i];
            
            // check that no trust limits are violated
            uint256 max = checkSendLimit(token, src, dest);
            require(wad <= max, "Trust limit exceeded");

            buildValidationData(src, dest, wad);
            
            // go ahead and do the transfers now so that we don't have to walk through this array again
            userToToken[token].hubTransfer(src, dest, wad);
        }
        // this will revert if there are any problems found
        validateTransferThrough(srcs.length);
    }
}

