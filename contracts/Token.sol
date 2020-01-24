pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./interfaces/HubI.sol";

contract Token is ERC20 {
    using SafeMath for uint256;

    uint8 public decimals = 18;

    string public name;
    uint256 public lastTouched;
    address public hub;
    address public owner;
    uint256 public inflationOffset;
    uint256 public currentRate;

    modifier onlyHub() {
        require(msg.sender == hub);
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    constructor(address _owner, string memory _name) public {
        require(_owner != address(0));
        name = _name;
        owner = _owner;
        hub = msg.sender;
        lastTouched = time();
        inflationOffset = findInflationOffset();
        // initial = HubI(hub).issuance();
        currentRate = HubI(hub).issuance();
        // _mint(_owner, _initial);
        _mint(_owner, currentRate);
    }

    function time() internal view returns (uint) {
        return block.timestamp;
    }

    function symbol() public view returns (string memory) {
        return HubI(hub).symbol();
    }

    function inflation() public view returns (uint256) {
        return HubI(hub).inflation();
    }

    function divisor() public view returns (uint256) {
        return HubI(hub).divisor();
    }

    function period() public view returns (uint256) {
        return HubI(hub).period();
    }

    function periods() public view returns (uint256) {
        // if (block.timestamp.sub(lastTouched) == period()) return 1;
        // if (block.timestamp.sub(lastTouched) < period()) return 0;
        // return (block.timestamp.sub(lastTouched)).div(period());
        return HubI(hub).periods();
    }

    function hubDeploy() public view returns (uint256) {
        return HubI(hub).deployedAt();
    }

    function findInflationOffset() public view returns (uint256) {
        return ((period().mul(periods().add(1))).add(hubDeploy())).sub(time());
    }

    // function look() public view returns (uint256) {
    //     uint256 p = periods();
    //     if (p == 0) return 0;
    //     if (p == 1) return HubI(hub).issuance();
    //     uint256 div = divisor();
    //     uint256 inf = inflation();
    //     uint256 q = HubI(hub).pow(inf, p);
    //     uint256 d = HubI(hub).pow(div, p);
    //     uint256 mid = q.sub(d);
    //     uint256 q1 = div.mul(initial).mul(mid);
    //     uint256 q2 = inf.sub(div);
    //     uint256 bal = q1.div(q2);
    //     return (bal.div(d)).sub(initial);
    // }

    function look() public view returns (uint256) {
        uint256 payout = 0;
        uint256 clock = lastTouched;
        uint256 offset = inflationOffset;
        uint256 rate = currentRate;
        while (clock.add(offset) <= time()) {
            payout = payout.add(offset.mul(rate));
            clock = clock.add(offset);
            offset = period();
            rate = HubI(hub).inflate(rate, 1);
        }
        payout = payout.add((time().sub(clock)).mul(rate));
        // inflationOffset = findInflationOffset();
        // lastTouched = time();
        return payout;
    }

    // function updateTime() internal {
    //     uint256 sec = period().mul(periods());
    //     lastTouched = lastTouched.add(sec);
    // }

    function update() public returns (uint256) {
        uint256 gift = look();
        if (gift > 0) {
            inflationOffset = findInflationOffset();
            lastTouched = time();
            currentRate = HubI(hub).issuance();
            _mint(owner, gift);
        }
    }

    function hubTransfer(
        address from, address to, uint256 amount
    ) public onlyHub returns (bool) {
        if (from == owner) {
            update();
        }
        _transfer(from, to, amount);
    }

    function transfer(address dst, uint wad) public returns (bool) {
        if (msg.sender == owner) {
            update();
        }
        return super.transfer(dst, wad);
    }

    function approve(address guy, uint wad) public returns (bool) {
        return super.approve(guy, wad);
    }

    function totalSupply() public view returns (uint256) {
        return super.totalSupply().add(look());
    }

    function balanceOf(address src) public view returns (uint256) {
        uint256 balance = super.balanceOf(src);

        if (src == owner) {
           balance = balance.add(look());
        }

        return balance;
    }
}
