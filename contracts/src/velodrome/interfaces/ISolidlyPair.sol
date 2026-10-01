// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.9.0;

interface ISolidlyPair {
    function factory() external view returns (address);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function burn(address to) external returns (uint amount0, uint amount1);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function stable() external view returns (bool);
    function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256);
    function quote(address tokenIn, uint256 amountIn, uint256 granularity) external view returns (uint256 amountOut);
    function claimFees() external returns (uint256 claimed0, uint256 claimed1);
}