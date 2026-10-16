// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IRateReader} from "../interfaces/IRateReader.sol";
import {IMetaMorpho, IMorphoBlue, IIrm, Id, Market, MarketParams} from "../interfaces/IExternal.sol";

/// @title MetaMorphoRateReader
/// @notice Net supply APR of a Morpho Vault V1 (MetaMorpho V1.0/V1.1): position-weighted supply rate of the
/// vault's markets, after Morpho market fees and the vault's performance fee. `target` is the MetaMorpho vault.
/// @dev Uses the last-accrued market state (same as Morpho's own API "native APY" before compounding). Markets
/// whose IRM view reverts are skipped (counted at 0%), which can only understate the rate.
contract MetaMorphoRateReader is IRateReader {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant SECONDS_PER_YEAR = 365 days;

    function supplyRate(address target) external view returns (uint256) {
        IMetaMorpho vault = IMetaMorpho(target);
        IMorphoBlue morpho = IMorphoBlue(vault.MORPHO());
        uint256 length = vault.withdrawQueueLength();

        uint256 totalSupplied;
        uint256 weightedRate; // sum(assets * perSecondSupplyRate), WAD-scaled rate

        for (uint256 i; i < length; i++) {
            Id id = vault.withdrawQueue(i);
            (uint256 supplyShares,,) = morpho.position(id, target);
            if (supplyShares == 0) continue;
            Market memory m = morpho.market(id);
            if (m.totalSupplyShares == 0 || m.totalSupplyAssets == 0) continue;

            uint256 assets = supplyShares * m.totalSupplyAssets / m.totalSupplyShares;
            totalSupplied += assets;

            if (m.totalBorrowAssets == 0) continue;
            MarketParams memory params = morpho.idToMarketParams(id);
            if (params.irm == address(0)) continue;

            uint256 borrowRate;
            try IIrm(params.irm).borrowRateView(params, m) returns (uint256 r) {
                borrowRate = r;
            } catch {
                continue;
            }
            uint256 utilization = uint256(m.totalBorrowAssets) * WAD / m.totalSupplyAssets;
            uint256 marketSupplyRate = borrowRate * utilization / WAD * (WAD - m.fee) / WAD;
            weightedRate += assets * marketSupplyRate;
        }

        if (totalSupplied == 0) return 0;
        uint256 grossPerSecond = weightedRate / totalSupplied;
        return grossPerSecond * SECONDS_PER_YEAR * (WAD - vault.fee()) / WAD;
    }
}
