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

    uint256 public LIMIT_EPOCH; // = 3600;

    struct EdgeWeight {
        uint256 limit;
        uint256 value;
        uint256 lastTouched;
    }

    mapping (address => bool) public relayers;
    mapping (address => Token) public userToToken;
    mapping (address => address) public tokenToUser;
    mapping (address => bool) public isOrganization;
    mapping (address => bool) public isValidator;
    mapping (address => mapping (address => EdgeWeight)) public edges;

    event Signup(address indexed user, address token);
    event OrganizationSignup(address indexed organization);
    event Trust(address indexed from, address indexed to, uint256 limit);
    event RegisterValidator(address indexed validator);
    event UpdateTrustLimit(address indexed from, address indexed to, uint256 limit);

    modifier onlyOwner() {
        require (msg.sender == owner);
        _;
    }

    modifier onlyRelayer() {
        require (relayers[msg.sender]);
        _;
    }

    constructor(address _owner, uint256 _issuance, uint256 _demurrage, string memory _symbol, uint256 _limitEpoch, uint256 _initialPayout) public {
        require (_owner != address(0));
        owner = _owner;
        issuanceRate = _issuance;
        demurrageRate = _demurrage;
        symbol = _symbol;
        LIMIT_EPOCH = _limitEpoch;
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

    function updateLimitEpoch(uint256 _limitEpoch) public onlyOwner returns (bool) {
        //safetyyyy
        LIMIT_EPOCH = _limitEpoch;
        return true;
    }

    function updateSymbol(string memory _symbol) public onlyOwner returns (bool) {
        //maybe we don't need to validate this one?
        symbol = _symbol;
        return true;
    }

    function time() public view returns (uint) { return block.timestamp; }

    function trustable(address _address) public returns (bool) {
        return (address(userToToken[_address]) != address(0) || isValidator[_address]) && !isOrganization[_address];
    }

    function organizationSignup() external returns (bool) {
        return _organizationSignup(msg.sender);
    }

    function relayerOrganizationSignup(address sender) external onlyRelayer returns (bool) {
        return _organizationSignup(msg.sender);
    }

    function _organizationSignup(address sender) internal returns (bool) {
        require(address(userToToken[sender]) == address(0));
        require(!isOrganization[sender]);
        isOrganization[sender] = true;
        emit OrganizationSignup(sender);
        return true;
    }

    function signup(string calldata _name) external returns (bool) {
        return _signup(msg.sender, _name);
    }

    function relayerSignup(address sender, string calldata _name) external onlyRelayer returns (bool) {
        return _signup(sender, _name);
    }

    // No exit allowed. Once you create a personal token, you're in for good.
    function _signup(address sender, string memory _name) internal returns (bool) {
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
    function trust(address toTrust, bool yes, uint limit) public {
        require(trustable(toTrust));
        edges[msg.sender][toTrust] = yes ? EdgeWeight(limit, 0, time()) : EdgeWeight(0, 0, 0);
        emit Trust(msg.sender, toTrust, limit);
    }

    function updateTrustLimit(address toUpdate, uint256 limit) public {
        require(trustable(toUpdate));
        require(address(tokenToUser[toUpdate]) != address(0));
        edges[msg.sender][toUpdate] = EdgeWeight(limit, 0, time());
        emit UpdateTrustLimit(msg.sender, toUpdate, limit);
    }

    // Starts with msg.sender then ,
    // iterates through the nodes list swapping the nth token for the n+1 token
    function transferThrough(address[] memory nodes, address[] memory tokens, uint wad) public {

        uint tokenIndex = 0;

        address prevValidator;

        address prevNode;

        for (uint256 x = 0; x < nodes.length; x++) {

            address node = nodes[x];
            // Cast token to a Token at tokenIndex
            Token token = Token(tokens[tokenIndex]);

            // If there exist a previous validator
            if (prevValidator != address(0)) {
                prevNode = prevValidator;
                prevValidator = address(0);
            }
            else {
                prevNode = address(token);
            }
            // edges[node][prevNode]
            // assert that a valid trust relationship exists
            assert(edges[node][prevNode].lastTouched != 0);

            // If the last time the relationship was touched is less than the limit epoch
            // add the current value of the edge to the transaction value and update the current value
            edges[node][prevNode].value = time().sub(edges[node][prevNode].lastTouched) < LIMIT_EPOCH
                ? edges[node][prevNode].value.add(wad)
                : wad;

            // update lastTouched to reflect this transaction
            edges[node][prevNode].lastTouched = time();

            // assert that the limit is greater than the proposed value
            assert(edges[node][prevNode].limit >= edges[node][prevNode].value);

            if (isValidator[node]) {
                prevValidator = node;
            } else {
                // Transfer the current token from the msg.sender to the current node
                token.transferFrom(msg.sender, node, wad);

                // If this is not the last token in the list transfer the nextToken
                // from the current node to the msg.sender
                if (tokenIndex + 1 < tokens.length) {

                    Token nextToken = Token(tokens[tokenIndex + 1]);
                    nextToken.transferFrom(node, msg.sender, wad);
                }
                tokenIndex++;
            }
        }
    }
}

