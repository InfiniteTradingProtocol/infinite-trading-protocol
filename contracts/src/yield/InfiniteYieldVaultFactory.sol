// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {InfiniteYieldBootstrapper} from "./InfiniteYieldBootstrapper.sol";
import {InfiniteWeightedBootstrapper} from "./InfiniteWeightedBootstrapper.sol";
import {SafeERC20Lib} from "morpho-vault-v2/libraries/SafeERC20Lib.sol";

/// @notice Enumerable, DAO-only two-phase launches. The bootstrapper transfers all vault roles to the DAO.
contract InfiniteYieldVaultFactory is Ownable2Step, ReentrancyGuardTransient {
    struct Launch {
        address bootstrapper;
        address vault;
        address registry;
        address allocator;
        bytes32 configHash;
        uint256 createdAt;
        bool finalized;
    }

    Launch[] private _launches;
    event LaunchStarted(uint256 indexed id, address indexed vault, address bootstrapper);
    event LaunchFinalized(uint256 indexed id, address indexed vault, address registry, address allocator);
    error InvalidLaunch();
    error RenounceDisabled();

    constructor(address dao) Ownable(dao) {}

    function launchCount() external view returns (uint256) {
        return _launches.length;
    }

    function launch(uint256 id) external view returns (Launch memory) {
        return _launches[id];
    }

    function start(InfiniteYieldBootstrapper.Config calldata c, uint256[] calldata weights)
        external
        onlyOwner
        nonReentrant
        returns (uint256 id)
    {
        require(c.safe == owner() && weights.length == c.integrations.length, InvalidLaunch());
        uint256 sum;
        for (uint256 i; i < weights.length; ++i) sum += weights[i];
        require(sum == 1e18, InvalidLaunch());
        InfiniteWeightedBootstrapper boot = new InfiniteWeightedBootstrapper(weights);
        (address vault,) = boot.deployVault(c);
        id = _launches.length;
        _launches.push(Launch(address(boot), vault, address(0), address(0), keccak256(abi.encode(c)), block.timestamp, false));
        emit LaunchStarted(id, vault, address(boot));
    }

    function finalize(uint256 id, InfiniteYieldBootstrapper.Config calldata c)
        external
        onlyOwner
        nonReentrant
        returns (InfiniteYieldBootstrapper.Deployment memory d)
    {
        Launch storage l = _launches[id];
        require(!l.finalized && keccak256(abi.encode(c)) == l.configHash && c.safe == owner(), InvalidLaunch());
        l.finalized = true;
        if (c.seedAssets > 0) {
            SafeERC20Lib.safeTransferFrom(c.asset, msg.sender, address(this), c.seedAssets);
            SafeERC20Lib.safeApprove(c.asset, l.bootstrapper, c.seedAssets);
        }
        d = InfiniteWeightedBootstrapper(l.bootstrapper).finalize(c);
        l.registry = d.registry;
        l.allocator = d.allocator;
        emit LaunchFinalized(id, d.vault, d.registry, d.allocator);
    }

    function renounceOwnership() public view override onlyOwner {
        revert RenounceDisabled();
    }
}
