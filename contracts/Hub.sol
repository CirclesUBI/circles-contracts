// SPDX-License-Identifier: AGPL
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Token.sol";

contract Hub {
    using SafeMath for uint256;

    uint256 public inflation; // the inflation rate
    uint256 public divisor; // the largest power of 10 the inflation rate can be divided by
    uint256 public period; // the amount of sections between inflation steps
    string public symbol;
    uint256 public signupBonus; // a one-time payout made immediately on signup
    uint256 public initialIssuance; // the starting payout per second, this gets inflated by the inflation rate
    uint256 public deployedAt; // the timestamp this contract was deployed at
    uint256 public timeout; // longest a token can go without a ubi payout before it gets deactivated

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
        address identity;
        uint256 sent;
        uint256 received;
    }
    mapping (address => transferValidator) public validation;
    address[] public seen;

    constructor(
        uint256 _inflation,
        uint256 _period,
        string memory _symbol,
        uint256 _signupBonus,
        uint256 _initialIssuance,
        uint256 _timeout
    ) {
        inflation = _inflation;
        divisor = findDivisor(_inflation);
        period = _period;
        symbol = _symbol;
        signupBonus = _signupBonus;
        initialIssuance = _initialIssuance;
        deployedAt = block.timestamp;
        timeout = _timeout;
    }

    function findDivisor(uint256 _inf) internal pure returns (uint256) {
        uint256 iter = 0;
        while (_inf.div(pow(10, iter)) > 9) {
            iter += 1;
        }
        return pow(10, iter);
    }

    /// @return the amount of periods since hub was deployed
    function periods() public view returns (uint256) {
        return (block.timestamp.sub(deployedAt)).div(period);
    }

    /// @return current issuance rate
    function issuance() public view returns (uint256) {
        return inflate(initialIssuance, periods());
    }

    /// @return what the issuance would be at a particular amount of periods
    function issuanceStep(uint256 _periods) public view returns (uint256) {
        return inflate(initialIssuance, _periods);
    }

    /// @return initial issuance rate as if interest (inflation) has been compounded period times
    function inflate(uint256 _initial, uint256 _periods) public view returns (uint256) {
        uint256 q = pow(inflation, _periods);
        uint256 d = pow(divisor, _periods);
        return (_initial.mul(q)).div(d);
    }

    function time() public view returns (uint256) { return block.timestamp; }

    function signup() public {
        require(address(userToToken[msg.sender]) == address(0));

        Token token = new Token(msg.sender);
        userToToken[msg.sender] = token;
        tokenToUser[address(token)] = msg.sender;
        _trust(msg.sender, 100);

        emit Signup(msg.sender, address(token));
    }

    function organizationSignup() public {
        require(organizations[msg.sender] == false);

        organizations[msg.sender] = true;
        _trust(msg.sender, 100);

        emit OrganizationSignup(msg.sender);
    }

    // Trust does not have to be reciprocated.
    // (e.g. I can trust you but you don't have to trust me)
    function trust(address user, uint limit) public {
        require(address(userToToken[msg.sender]) != address(0) || organizations[msg.sender], "You can only trust people after you've signed up!");
        require(msg.sender != user, "You can't untrust yourself");
        require(organizations[user] == false, "You can't trust an organization");
        require(limit <= 100, "Limit must be a percentage out of 100");
        _trust(user, limit);
    }

    function _trust(address user, uint limit) internal {
        limits[msg.sender][user] = limit;
        emit Trust(msg.sender, user, limit);
    }

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

        //if the token doesn't exist, return 0
        // uint256 max = (userToToken[dest].totalSupply().mul(limits[dest][tokenOwner])).div(100);
        if (address(userToToken[tokenOwner]) == address(0)) {
             return 0;
        }

        uint256 srcBalance = userToToken[tokenOwner].balanceOf(src);

        // if sending dest's token to dest, src can send 100% of their holdings
        if (tokenOwner == dest || organizations[dest]) {
            return srcBalance;
        }
        uint256 destBalance = userToToken[tokenOwner].balanceOf(dest);
        
        uint256 max = (userToToken[dest].totalSupply().mul(limits[dest][tokenOwner])).div(100);
        // if trustLimit has already been overriden by a direct transfer, nothing more can be sent
        if (max < destBalance) return 0;
        return max.sub(destBalance);
    }

    // build the data structures we will use for validation
    // if we haven't seen the addresses, add them to the validation mapping
    // if we have, increment their sent/received amounts
    function buildValidationData(address src, address dest, uint wad) internal {
        if (validation[src].identity != address(0)) {
            validation[src].sent = validation[src].sent.add(wad);
        } else {
            validation[src].identity = src;
            validation[src].sent = wad;
            seen.push(src);
        }
        if (validation[dest].identity != address(0)) {
            validation[dest].received = validation[dest].received.add(wad);
        } else {
            validation[dest].identity = dest;
            validation[dest].received = wad; 
            seen.push(dest);   
        }
    }

    function validateTransferThrough(uint256 steps) internal {
        // a valid path has only one true sender and reciever, for all other
        // addresses in the path, sent = received
        // also, the sender should be msg.sender
        address src;
        address dest;
        for (uint i = 0; i < seen.length; i++) {
            transferValidator memory curr = validation[seen[i]];
            if (curr.sent > curr.received) {
                require(src == address(0), "Path sends from more than one src");
                require(curr.identity == msg.sender, "Path doesn't send from transaction sender");
                src = curr.identity;
            }
            if (curr.received > curr.sent) {
                require(dest == address(0), "Path sends to more than one dest");
                dest = curr.identity;
            }
        }
        require(src != address(0), "Transaction must have a src");
        require(dest != address(0), "Transaction must have a dest");
        // sender should not recieve, recipient should not send
        require(validation[src].received == 0, "Sender is receiving");
        require(validation[dest].sent == 0, "Recipient is sending");
        // the total amounts sent and received by src and dest should match
        require(validation[src].sent == validation[dest].received, "Unequal sent and received amounts");
        // the maximum amount of addresses we should see is one more than steps in the path
        require(seen.length <= steps + 1, "Seen too many addresses");
        emit HubTransfer(src, dest, validation[src].sent);
        // clean up the validation datastructures
        for (uint i = seen.length; i >= 1; i--) {
            validation[seen[i-1]].sent = 0;
            validation[seen[i-1]].received = 0;
            validation[seen[i-1]].identity = address(0);
            seen.pop();
        }
        // sanity check that we cleaned everything up correctly
        require(seen.length == 0, "Seen should be empty");
    }

    // Walks through tokenOwners, srcs, dests, and amounts array and
    // executes transtive transfer - also validates path
    function transferThrough(
        address[] memory tokenOwners,
        address[] memory srcs,
        address[] memory dests,
        uint[] memory wads
    ) public {
        require(dests.length == tokenOwners.length, "Tokens array length must equal dests array");
        require(srcs.length == tokenOwners.length, "Tokens array length must equal srcs array");
        require(wads.length == tokenOwners.length, "Tokens array length must equal amounts array");
        for (uint i = 0; i < srcs.length; i++) {
            address src = srcs[i];
            address dest = dests[i];
            address token = tokenOwners[i];
            uint256 wad = wads[i];
            
            // check that no trust limits are violated
            // you always trust yourself 100%
            if (token != dest) {
                uint256 max = checkSendLimit(token, src, dest);
                require(
                    userToToken[token].balanceOf(dest).add(wad) <= max,
                    "Trust limit exceeded"
                );
            }

            buildValidationData(src, dest, wad);

            userToToken[token].hubTransfer(src, dest, wad);
        }
        validateTransferThrough(srcs.length);
    }
}

