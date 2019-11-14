pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./interfaces/HubI.sol";

contract Token is ERC20 {
    using SafeMath for uint256;

    uint8 public decimals = 18;

    string public name;
    uint public lastTouched;
    address public hub;
    HubI public controller;
    address public owner;

    modifier onlyHub() {
        require(msg.sender == hub);
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    constructor(address _owner, string memory _name, uint256 initialPayout) public {
        require(_owner != address(0));
        name = _name;
        owner = _owner;
        hub = msg.sender;
        lastTouched = time();
        _mint(_owner, initialPayout);
    }

    function time() internal view returns (uint) {
        return block.timestamp;
    }

    function symbol() public view returns (string memory) {
        return HubI(hub).symbol();
    }

    function pow(uint256 base, uint256 exponent) internal pure returns (uint256) {
        if (exponent == 0) {
            return 1;
        }
        if (exponent == 1) {
            return base;
        }
        if (base == 0) {
            return 0;
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

    function look() public view returns (uint256) {
        uint256 period = time().sub(lastTouched);
        uint256 issuance = HubI(hub).issuanceRate();
        return issuance.mul(period);
    }

    // the universal basic income part
    function update() public {
        uint256 gift = look();
        //this._mint(cast(gift));
        lastTouched = time();
    }

    function hubTransfer(
        address from, address to, uint256 amount
    ) public onlyHub returns (bool) {
        _transfer(from, to, amount);
    }

    function transfer(address dst, uint wad) public returns (bool) {
        update();
        return super.transfer(dst, wad);
    }

    function approve(address guy, uint wad) public returns (bool) {
        return super.approve(guy, wad);
    }

    function totalSupply() public view returns (uint256) {
        return super.totalSupply();//.add(look());
    }

    function balanceOf(address src) public view returns (uint256) {
        uint256 balance = super.balanceOf(src);

        //if (src == owner) {
        //    balance = balance.add(look());
        //}

        return balance;
    }
}
