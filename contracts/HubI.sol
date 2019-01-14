pragma solidity ^0.4.24;

contract HubI {
    function issuanceRate() public returns (uint256);
    function demurrageRate() public returns (uint256);
    function decimals() public returns (uint8);
    function symbol() public returns (string);
}
