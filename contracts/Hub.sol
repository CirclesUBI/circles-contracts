pragma solidity ^0.4.24;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract CirclesHub is Ownable {
    using SafeMath for uint256;

    uint256 public issuanceRate = 1736111111111111; // ~1050 tokens per week

    uint constant LIMIT_EPOCH = 3600;

    struct EdgeWeight {
        uint limit;
        uint value;
        uint lastTouched;
    }

    mapping (address => CirclesToken) public userToToken;
    mapping (address => address) public tokenToUser;

    mapping (address => bool) isValidator;

    mapping (address => mapping (address => EdgeWeight)) public edges;

    function time() returns (uint) { return block.timestamp; }

    // No exit allowed. Once you create a personal token, you're in for good.
    function join() note {
        assert(address(userToToken[msg.sender]) == 0);
        var token = new CirclesToken(msg.sender);
        userToToken[msg.sender] = token;
        tokenToUser[address(token)] = msg.sender;
    }

    function register() note {
        isValidator[msg.sender] = true;
    }

    // Trust does not have to be reciprocated.
    // (e.g. I can trust you but you don't have to trust me)
    function trust(address node, bool yes, uint limit) note {
        assert(address(tokenToUser[node]) != 0 || isValidator[node]);
        edges[msg.sender][node] = yes ? EdgeWeight(limit, 0, time()) : EdgeWeight(0, 0, 0);

    }

    // Starts with msg.sender then ,
    // iterates through the nodes list swapping the nth token for the n+1 token
    function transferThrough(address[] nodes, address[] tokens, uint wad) note {

        uint tokenIndex = 0;

        address prevValidator;

        address prevNode;

        for (var x = 0; x < nodes.length; x++) {

            var node = nodes[x];
            // Cast token to a CirclesToken at tokenIndex
            var token = CirclesToken(tokens[tokenIndex]);

            // If there exist a previous validator
            if (prevValidator != 0) {
                prevNode = prevValidator;
                prevValidator = 0;
            }
            else {
                prevNode = token;
            }
            // edges[node][prevNode]
            // assert that a valid trust relationship exists
            assert(edges[node][prevNode].lastTouched != 0);

            // If the last time the relationship was touched is less than the limit epoch
            // add the current value of the edge to the transaction value and update the current value
            edges[node][prevNode].value = time() - edges[node][prevNode].lastTouched < LIMIT_EPOCH
                ? edges[node][prevNode].value + wad
                : wad;

            // update lastTOuched to reflect this transaction
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

                    var nextToken = CirclesToken(tokens[tokenIndex + 1]);
                    nextToken.transferFrom(node, msg.sender, wad);
                }
                tokenIndex++;
            }
        }
    }
}	