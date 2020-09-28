// SPDX-License-Identifier: AGPL
pragma solidity ^0.7.0;
import "../Hub.sol";

contract MockHub is Hub {
    constructor(
        uint256 _inflation,
        uint256 _period,
        string memory _symbol,
        uint256 _initialPayout,
        uint256 _startingRate,
        uint256 _timeout
    )
    Hub(_inflation, _period, _symbol, _initialPayout, _startingRate, _timeout)
    {

    }

    function getSeen() public view returns (uint256) {
        return seen.length;
    }

    function getValidation(address user) public view returns (bool, uint256, uint256) {
        return (validation[user].seen, validation[user].sent, validation[user].received);
    }
}