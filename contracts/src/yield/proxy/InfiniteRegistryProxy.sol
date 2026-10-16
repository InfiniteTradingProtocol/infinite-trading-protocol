// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @notice ERC1967 proxy that may be deployed without init data.
/// @dev Only used by InfiniteYieldBootstrapper, which deploys and initializes it in the same transaction
///      (the registry and allocator reference each other, so init must happen after both exist).
contract InfiniteRegistryProxy is ERC1967Proxy {
    constructor(address implementation) ERC1967Proxy(implementation, "") {}

    function _unsafeAllowUninitialized() internal pure override returns (bool) {
        return true;
    }
}
