pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Token.sol";

//finish update function in token
//what should initial demurrage rate be? And initial issuance?
//more events in Token
//parallel transfer helper
//abstract ownership utils?

contract Hub {
    using SafeMath for uint256;

    address public owner;

    uint256 public issuanceRate; // = 1736111111111111; // ~1050 tokens per week
    uint256 public demurrageRate; // = 0;
    string public symbol; // = 'CRC';
    uint256 initialPayout;

    mapping (address => bool) public relayers;
    mapping (address => Token) public userToToken;
    mapping (address => address) public tokenToUser;
    mapping (address => mapping (address => uint256)) public limits;

    event Signup(address indexed user, address token);
    event Trust(address indexed from, address indexed to, uint256 limit);

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

    function updateRelayer(address _relayer, bool isRelayer) public onlyOwner returns (bool) {
        require(_relayer != address(0));
        relayers[_relayer] = isRelayer;
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

        emit Signup(msg.sender, address(token));
        return true;
    }

    // Trust does not have to be reciprocated.
    // (e.g. I can trust you but you don't have to trust me)
    function trust(address toTrust, uint limit) public {
        require(trustable(toTrust));
        limits[msg.sender][toTrust] = limit;
        emit Trust(msg.sender, toTrust, limit);
    }

    function checkSendLimit(address from, address to) public view returns (uint256) {
        uint256 max = (userToToken[from].totalSupply().mul(limits[to][from])).div(100);
        return max.sub(userToToken[from].balanceOf(to));
    }

    // Starts with msg.sender then ,
    // iterates through the nodes list swapping the nth token for the n+1 token
    function transferThrough(address[] memory users, uint wad) public {
        require(users.length <= 5);
        address prev = msg.sender;
        for (uint i = 0; i < users.length; i++) {
            address curr = users[i];
            uint256 max = checkSendLimit(prev, curr);

            require(userToToken[prev].balanceOf(curr) + wad <= max, "Trust limit exceeded");

            userToToken[prev].hubTransfer(prev, curr, wad);
            prev = curr;
        }
    }

}

