pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Token.sol";
import "./Organization.sol";

//role of validators
//hubfactory?
//finish update function in token
//what should initial demurrage rate be? And initial issuance?
//more events in Token
//parallel transfer helper
//organization can transfer, and transitively transfer
//abstract ownership utils?
//organization signup

contract Hub {
    using SafeMath for uint256;

    address public owner;

    uint256 public issuanceRate; // = 1736111111111111; // ~1050 tokens per week
    uint256 public demurrageRate; // = 0;
    string public symbol; // = 'CRC';
    uint256 initialPayout;

    mapping (address => Token) public userToToken;
    mapping (address => address) public tokenToUser;

    mapping (address => bool) public isOrganization;
    mapping (address => bool) public isValidator;

    mapping (address => mapping (address => uint)) public edges;

    event Signup(address indexed user, address token);
    event Trust(address indexed from, address indexed to, uint256 limit);
    event RegisterValidator(address indexed validator);
    event UpdateTrustLimit(address indexed from, address indexed to, uint256 limit);

    modifier onlyOwner() {
        require (msg.sender == owner);
        _;
    }

    constructor(address _owner, uint256 _issuance, uint256 _demurrage, string memory _symbol, uint256 _initialPayout) public {
        require (_owner != address(0));
        owner = _owner;
        issuanceRate = _issuance;
        demurrageRate = _demurrage;
        symbol = _symbol;
        initialPayout = _initialPayout;
    }

    function changeOwner(address _newOwner) public onlyOwner returns (bool) {
        require(_newOwner != address(0));
        owner = _newOwner;
        return true;
    }

    function updateIssuance(uint256 _issuance) public onlyOwner returns (bool) {
        // safety checks on issuance go here
        issuanceRate = _issuance;
        return true;
    }

    function updateDemurrage(uint256 _demurrage) public onlyOwner returns (bool) {
        // safety checks on demurrage go here
        demurrageRate = _demurrage;
        return true;
    }

    function updateSymbol(string memory _symbol) public onlyOwner returns (bool) {
        //maybe we don't need to validate this one?
        symbol = _symbol;
        return true;
    }

    // No exit allowed. Once you create a personal token, you're in for good.
    function signup(address sender, string calldata _name) external returns (bool) {
        require(address(userToToken[sender]) == address(0));
        require(!isOrganization[sender]);

        Token token = new Token(sender, _name, initialPayout);
        userToToken[sender] = token;
        tokenToUser[address(token)] = sender;

        emit Signup(sender, address(token));
        return true;
    }

    // no validation on the registering of validators
    function registerValidator(address validator) external {
        isValidator[validator] = true;
        emit RegisterValidator(validator);
    }

    // Trust does not have to be reciprocated.
    // (e.g. I can trust you but you don't have to trust me)
    function trust(address toTrust, uint limit) public {
        require(address(userToToken[toTrust]) != address(0) || isValidator[toTrust]);
        require(!isOrganization[toTrust]);
        edges[msg.sender][toTrust] = limit;
        emit Trust(msg.sender, toTrust, limit);
    }

    // Starts with msg.sender then ,
    // iterates through the nodes list swapping the nth token for the n+1 token
    function transferThrough(address[] memory users, uint wad) public {
        require(users.length <= 5);

        for (uint i = 0; i < users.length; i++) {
            require(address(userToToken[users[i]]) != address(0) || isValidator[users[i]]);
        }

        address prev = msg.sender;
        for (uint i = 0; i < users.length; i++) {
            address curr = users[i];

            if (isValidator[curr]) {

                address next = users[i+1];
                require(edges[curr][prev] > 0, "validator does not trust sender");
                require(userToToken[prev].balanceOf(next) + wad <= edges[next][curr], "trust limit exceeded");

                userToToken[prev].transferFrom(prev, next, wad);
                prev = next;
                i++;

            } else {

                require(userToToken[prev].balanceOf(curr) + wad <= edges[curr][prev], "trust limit exceeded");

                userToToken[prev].transferFrom(prev, curr, wad);
                prev = curr;

            }
        }
    }
}
