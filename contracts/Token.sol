pragma solidity ^0.4.24;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract CirclesToken is Ownable, StandardToken {

    uint public lastTouched;
    address public hub;
    uint public factor = 1736111111111111; // ~1050 tokens per week

    constructor(address _hub) {
        hub = _hub;
        lastTouched = time();
    }

    function time() returns (uint) {
        return block.timestamp;
    }

    function look() returns (uint) {
        var period = time() - lastTouched;
        return factor * period;
    }

    // the universal basic income part
    function update() {
        var gift = look();
        this.mint(cast(gift));
        this.push(person, cast(gift));
        lastTouched = time();
    }

    function transferFrom(
        address src, address dst, uint wad
    ) returns (bool) {
        update();

        // TokenManager doesn't need approval to transferFrom
        if (msg.sender == owner) {
            assert(_balances[src] >= wad);
        
            _balances[src] = sub(_balances[src], wad);
            _balances[dst] = add(_balances[dst], wad);
        
            Transfer(src, dst, wad);
        
            return true;
        } else {
            return super.transferFrom(src, dst, wad);
        }
        
    }

    function transfer(address dst, uint wad) returns (bool) {
        if (msg.sender != address(this)) {
            update();
        }
        return super.transfer(dst, wad);
    }


    function approve(address guy, uint wad) returns (bool) {
        update();
        return super.approve(guy, wad);
    }

    function totalSupply() constant returns (uint256) {
        return super.totalSupply() + look();
    }

    function balanceOf(address src) constant returns (uint256) {
        var balance = super.balanceOf(src);

        if (src == person) {
            balance = add(balance, look());
        }

        return balance;
    }
}