// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import "forge-std/src/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UniV3AutoCompounder} from "../src/UniV3AutoCompounder.sol";

contract DeployCbEGGSVault is Script {
    function run() external {
        address impl    = 0x578621734b779162A954256cb2903632B8144D5E;
        address token0  = 0x4200000000000000000000000000000000000006; // WETH
        address token1  = 0xdDbAbe113c376f51E5817242871879353098c296; // cbEGGS
        uint24  poolFee = 10000;
        address pool    = 0x95CB82D517A1Ce4e6ac4312BCf718cD0EE9f3884;
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

        console.log("Proxy (vault):", address(proxy));
        console.log("Implementation:", impl);
    }
}
