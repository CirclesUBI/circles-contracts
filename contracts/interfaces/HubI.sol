pragma solidity ^0.7.0;

interface HubI {
    function issuance() external view returns (uint256);
    function issuanceStep(uint256) external view returns (uint256);
    function inflation() external view returns (uint256);
    function divisor() external view returns (uint256);
    function period() external view returns (uint256);
    function periods() external view returns (uint256);
    function pow(uint256, uint256) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function symbol() external view returns (string memory);
    function deployedAt() external view returns (uint256);
    function inflate(uint256, uint256) external view returns (uint256);
}
