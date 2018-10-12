pragma solidity ^0.4.24;

import "../lib/ds-proxy/lib/ds-auth/src/auth.sol";
import "./interfaces/ERC20.sol";
import "./TimeIssuedToken.sol";

contract Person is DSAuth {

    // ---------------------------------------------------------------------------------
    // Token

    TimeIssuedToken public token; 

    constructor(
        string name,
        string symbol
    ) public {
        uint8 decimals = 18;
        uint256 issuanceRate = 1;

        token = new TimeIssuedToken(this, issuanceRate, name, symbol, decimals);
    }

    function token() public view returns (address) {
        return address(token);
    }

    // ---------------------------------------------------------------------------------
    // Trust

    // TODO: Add limits?
    mapping (address => bool) public trusted;

    function trust( address person ) public auth {
        trusted[person] = true;
    }

    function untrust( address person ) public auth {
        trusted[person] = false;
    }

    // ---------------------------------------------------------------------------------
    // Exchange

    function exchangeTransfer( 
        address[] path, 
        uint256 value 
    ) public {
        Person next = Person(path[path.length - 1]);
        path = shrink(path);

        require(token.approve(next, value));
        require(next.exchangeTransfer(this, path, value));
    }

    function exchangeTransfer( 
        address prev,
        address[] path, 
        uint256 value 
    ) private {
        if (path.length == 0) {
            require(token.transferFrom(prev, this, value));
            return;
        }

        require(trusted[prev], "offered token is not trusted");

        Person next = Person(path[path.length - 1]);
        path = shrink(path);

        require(token.transferFrom(prev, this, value));
        require(token.approve(next, value));
        require(next.exchangeTransfer(this, path, value));
    }

    function shrink(address[] path) private returns (address[]) {
        delete path[path.length - 1];
        path.length--;
        return path;
    }


    // !!! WARNING !!!
    // 
    //  BE SURE NOT TO APPROVE AN EXCHANGE TO MOVE YOUR TOKENS WITHOUT ALSO
    //  RUNNING A TRANSFER OR APPROVAL IN THE SAME TRANSACTION SCRIPT, OR ANYONE
    //  COULD STEAL THOSE COINS
    //
    // !!! WARNING !!!

    // function exchangeApprove( 
    //     address src, 
    //     address given, 
    //     address dest, 
    //     address received, 
    //     uint256 value 
    // ) public {
    //     require(trusted[given], 
    //             "given token is not trusted");

    //     require(ERC20(given).transferFrom(src, this, value), 
    //             "cannot transfer given token from src");

    //     require(ERC20(received).approve(dest, value), 
    //             "Unable to approve transfer of desired token");
    // }

}
