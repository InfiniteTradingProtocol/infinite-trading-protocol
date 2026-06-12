// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import "forge-std/src/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UniV3AutoCompounder} from "../src/UniV3AutoCompounder.sol";

contract DeployITPAEROVault is Script {
    function run() external {
        address impl    = 0x1c0D7650E200199395b1b5AB109f7914D13D724d; // v5
        address token0  = 0x940181a94A35A4569E4529A3CDfB74e38FD98631; // AERO
        address token1  = 0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440; // ITP
        uint24  poolFee = 10000;
        address pool    = 0x3819e346E6347d75ceF0CfFd3FF41489f543a9Cc;
        address keeper  = 0xE6C312d661bE5e3eC022e2F18e084713A434A340;
        address keeper2 = 0x233EC2735d58698eFC4d5f24A521AA251252f0C0;
        address dao     = 0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB;

        bytes memory initData = abi.encodeCall(
            UniV3AutoCompounder(impl).initialize,
            (token0, token1, poolFee, pool, keeper, dao, keeper2)
        );

        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        ERC1967Proxy proxy = new ERC1967Proxy(impl, initData);
        vm.stopBroadcast();

        console.log("ITP/AERO Proxy (vault):", address(proxy));
        console.log("Implementation (v5):", impl);
    }
}
