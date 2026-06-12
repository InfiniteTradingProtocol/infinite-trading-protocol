// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import "forge-std/src/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UniV3AutoCompounder} from "../src/UniV3AutoCompounder.sol";

contract DeployITPcbXRPVault is Script {
    function run() external {
        address impl    = 0x578621734b779162A954256cb2903632B8144D5E;
        address token0  = 0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440; // ITP
        address token1  = 0xcb585250f852C6c6bf90434AB21A00f02833a4af; // cbXRP
        uint24  poolFee = 10000;
        address pool    = 0x33840Ce3817ef3F79DA49EC70e4653c4aE20eE3F;
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
