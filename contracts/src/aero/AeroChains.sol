// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Classic Aero addresses published at https://app.aero.xyz/docs/security/ (2026-10-21).
/// Base pays AERO; leaf chains pay their local xAERO receipt token.
library AeroChains {
    address internal constant STABLE_FACTORY = 0x78589E876edcEbdce72ee3436ab3c9AD3a7cEF2D;
    address internal constant VOLATILE_FACTORY = 0x8E6a9FCd1d638CC760Ffba397605Fe3355dE76D2;
    address internal constant LEAF_VOTER = 0x382409fad8503FbCdbB27A4211551fa03e884078;
    address internal constant METAROUTER = 0x0fEf9e88A7b76BCDBF451780C6774FE32965Ee98;
    address internal constant ROOT_HANDLER = 0x8C37F30F3c8fd48bEddb14086fa5148291D422C3;

    error UnsupportedChain();

    function gaugeFactories(uint256 chainId) internal pure returns (address stable, address volatile_) {
        if (chainId == 8453) {
            return (0x1e0f776E88649285f99e65Fa599aD6e0f9D97800, 0x9FBCf2Df0DC553ce40Ef63963Bff465b76792B7E);
        }
        if (chainId == 10) {
            return (0x3924b18EDd37267dab6eDd99a3Bb339bf2b668fD, 0x1B5D13975371806D699dC616A96D15B8eD26e5Ca);
        }
        if (chainId == 1) {
            return (0xCCe24256a8a6070A9E308f23E044C87C343F98Cd, 0x7F83235643181E440433400a027618Cd50879751);
        }
        if (chainId == 4663) {
            return (0x1733cD126a227066963E9B636Ad49898d1224741, 0xCCe24256a8a6070A9E308f23E044C87C343F98Cd);
        }
        revert UnsupportedChain();
    }

    function rewardToken(uint256 chainId) internal pure returns (address) {
        if (chainId == 8453) return 0x3f5bF3EdAc59d650D8fDf9657a71F2f904A3a4Ee;
        if (chainId == 10) return 0xbdEaeA5205d16f34Cb40038052d91235D87B4C54;
        if (chainId == 1 || chainId == 4663) return 0x9e148C5716b5aAdCFD3B71cEAE9EE7a9e22C29E2;
        revert UnsupportedChain();
    }
}
