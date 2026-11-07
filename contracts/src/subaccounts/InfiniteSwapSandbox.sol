// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuardTransient } from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import { IInfiniteSubaccountFactory } from "./interfaces/IInfiniteSubaccountFactory.sol";

/// @title InfiniteSwapSandbox
/// @notice Stateless executor that runs agent-supplied router calldata on behalf of Infinite Subaccounts.
/// @dev The router is never called with an account as msg.sender. The sandbox holds only the `amountIn` the account
///      sent it for this call and has no other approvals, so router calldata cannot pull anything else from the
///      account, whatever allowances the owner granted that router earlier. After the call every remaining tokenIn
///      and all tokenOut go back to the calling account, which then checks its balance changes against the oracle.
contract InfiniteSwapSandbox is ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    IInfiniteSubaccountFactory public immutable factory;

    error NotAccount();
    error RouterCallFailed(bytes reason);

    constructor(address factory_) {
        factory = IInfiniteSubaccountFactory(factory_);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        address router,
        uint256 amountIn,
        bytes calldata data
    )
        external
        nonReentrant
    {
        if (!factory.isAccount(msg.sender)) revert NotAccount();

        IERC20(tokenIn).forceApprove(router, amountIn);
        (bool ok, bytes memory reason) = router.call(data);
        if (!ok) revert RouterCallFailed(reason);
        IERC20(tokenIn).forceApprove(router, 0);

        uint256 out = IERC20(tokenOut).balanceOf(address(this));
        if (out > 0) IERC20(tokenOut).safeTransfer(msg.sender, out);
        uint256 left = IERC20(tokenIn).balanceOf(address(this));
        if (left > 0) IERC20(tokenIn).safeTransfer(msg.sender, left);
    }
}
