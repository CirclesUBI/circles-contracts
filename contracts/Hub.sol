pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Token.sol";

contract Hub {
    using SafeMath for uint256;

    address public owner;

    uint256 public inflation;
    uint256 public divisor;
    uint256 public period;
    string public symbol; // = 'CRC';
    uint256 public initialPayout;
    uint256 public deployedAt;

    mapping (address => Token) public userToToken;
    mapping (address => address) public tokenToUser;
    mapping (address => mapping (address => uint256)) public limits;

    event Signup(address indexed user, address token);
    event Trust(address indexed from, address indexed to, uint256 limit);

    struct transferValidator {
        address identity;
        uint256 sent;
        uint256 received;
    }

    mapping (address => transferValidator) private validation;
    address[] private seen;

    modifier onlyOwner() {
        require (msg.sender == owner);
        _;
    }

    constructor(address _owner, uint256 _inflation, uint256 _divisor, uint256 _period, string memory _symbol, uint256 _initialPayout) public {
        require (_owner != address(0));
        owner = _owner;
        inflation = _inflation;
        divisor = _divisor;
        period = _period;
        symbol = _symbol;
        initialPayout = _initialPayout;
        deployedAt = block.timestamp;
    }

    function periods() public view returns (uint256) {
        return (block.timestamp.sub(deployedAt)).div(period);
    }

    function issuance() public view returns (uint256) {
        uint256 q = pow(inflation, periods());
        uint256 d = pow(divisor, periods());
        return (initialPayout.mul(q)).div(d);
    }

    function changeOwner(address _newOwner) public onlyOwner returns (bool) {
        require(_newOwner != address(0));
        owner = _newOwner;
        return true;
    }

    function updateInflation(uint256 _inflation) public onlyOwner returns (bool) {
        // safety checks on issuance go here
        inflation = _inflation;
        return true;
    }

    function updateSymbol(string memory _symbol) public onlyOwner returns (bool) {
        //maybe we don't need to validate this one?
        symbol = _symbol;
        return true;
    }

    function time() public view returns (uint) { return block.timestamp; }

    function trustable(address _address) public view returns (bool) {
        return (address(userToToken[_address]) != address(0));
    }

    // No exit allowed. Once you create a personal token, you're in for good.
    function signup(string memory _name) public returns (bool) {
        require(address(userToToken[msg.sender]) == address(0));

        Token token = new Token(msg.sender, _name, initialPayout);
        userToToken[msg.sender] = token;
        tokenToUser[address(token)] = msg.sender;
        _trust(msg.sender, 100);

        emit Signup(msg.sender, address(token));
        return true;
    }

    // Trust does not have to be reciprocated.
    // (e.g. I can trust you but you don't have to trust me)
    function trust(address toTrust, uint limit) public {
        //require(trustable(toTrust));
        require(msg.sender != toTrust, "You can't untrust yourself");
        _trust(toTrust, limit);
    }

    function _trust(address toTrust, uint limit) internal {
        limits[msg.sender][toTrust] = limit;
        emit Trust(msg.sender, toTrust, limit);
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

    function checkSendLimit(address token, address from, address to) public view returns (uint256) {
        // if the token doesn't exist, nothing can be sent
        if (address(userToToken[token]) == address(0)) {
            return 0;
        }
        // if sending dest's token to dest, src can send 100% of their holdings
        if (token == to) {
            return userToToken[token].balanceOf(from);
        }
        uint256 max = (userToToken[token].totalSupply().mul(limits[to][token])).div(100);
        return max.sub(userToToken[token].balanceOf(to));
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
    function transferThrough(address[] memory tokenOwners, address[] memory srcs, address[] memory dests, uint[] memory wads) public {
        require(srcs.length <= 5, "Too complex path");
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
                require(userToToken[token].balanceOf(dest) + wad <= max, "Trust limit exceeded");
            }

            buildValidationData(src, dest, wad);

            userToToken[token].hubTransfer(src, dest, wad);
        }
        validateTransferThrough(srcs.length);
    }

    function getSeen() public view returns (uint256) {
        return seen.length;
    }

    function getValidation(address user) public view returns (address, uint256, uint256) {
        return (validation[user].identity, validation[user].sent, validation[user].received);
    }

}

