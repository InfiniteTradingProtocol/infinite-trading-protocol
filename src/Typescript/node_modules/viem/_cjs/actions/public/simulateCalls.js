"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateCalls = simulateCalls;
const AbiConstructor = require("ox/AbiConstructor");
const AbiEvent = require("ox/AbiEvent");
const AbiFunction = require("ox/AbiFunction");
const parseAccount_js_1 = require("../../accounts/utils/parseAccount.js");
const address_js_1 = require("../../constants/address.js");
const contracts_js_1 = require("../../constants/contracts.js");
const base_js_1 = require("../../errors/base.js");
const contract_js_1 = require("../../errors/contract.js");
const node_js_1 = require("../../errors/node.js");
const pad_js_1 = require("../../utils/data/pad.js");
const fromHex_js_1 = require("../../utils/encoding/fromHex.js");
const call_js_1 = require("./call.js");
const getBlock_js_1 = require("./getBlock.js");
const getBlockNumber_js_1 = require("./getBlockNumber.js");
const simulateBlocks_js_1 = require("./simulateBlocks.js");
const getBalanceCode = '0x6080604052348015600e575f80fd5b5061016d8061001c5f395ff3fe608060405234801561000f575f80fd5b5060043610610029575f3560e01c8063f8b2cb4f1461002d575b5f80fd5b610047600480360381019061004291906100db565b61005d565b604051610054919061011e565b60405180910390f35b5f8173ffffffffffffffffffffffffffffffffffffffff16319050919050565b5f80fd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6100aa82610081565b9050919050565b6100ba816100a0565b81146100c4575f80fd5b50565b5f813590506100d5816100b1565b92915050565b5f602082840312156100f0576100ef61007d565b5b5f6100fd848285016100c7565b91505092915050565b5f819050919050565b61011881610106565b82525050565b5f6020820190506101315f83018461010f565b9291505056fea26469706673582212203b9fe929fe995c7cf9887f0bdba8a36dd78e8b73f149b17d2d9ad7cd09d2dc6264736f6c634300081a0033';
const staticCallCode = '0x608060405234801561000f575f5ffd5b5060043610610029575f3560e01c8063fd00430c1461002d575b5f5ffd5b6100476004803603810190610042919061012b565b610049565b005b80825f375f5f825f865afa610060573d5f5f3e3d5ffd5b3d5f5f3e3d5ff35b5f5ffd5b5f5ffd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f61009982610070565b9050919050565b6100a98161008f565b81146100b3575f5ffd5b50565b5f813590506100c4816100a0565b92915050565b5f5ffd5b5f5ffd5b5f5ffd5b5f5f83601f8401126100eb576100ea6100ca565b5b8235905067ffffffffffffffff811115610108576101076100ce565b5b602083019150836001820283011115610124576101236100d2565b5b9250929050565b5f5f5f6040848603121561014257610141610068565b5b5f61014f868287016100b6565b935050602084013567ffffffffffffffff8111156101705761016f61006c565b5b61017c868287016100d6565b9250925050925092509256fea2646970667358221220635ed99185cacf3f2acba6921f23687c969cec2bbaf5f9ad599f507e6e105e6964736f6c63430008230033';
const assetProbeGas = 1000000n;
const staticCallAddressBase = 0x00000000000000000000000000000000deadbeefn;
const transferEventSelector = AbiEvent.getSelector(AbiEvent.from('event Transfer(address indexed from, address indexed to, uint256 value)'));
const balanceOfFunction = AbiFunction.from('function balanceOf(address) returns (uint256)');
const decimalsFunction = AbiFunction.from('function decimals() returns (uint256)');
const tokenUriFunction = AbiFunction.from('function tokenURI(uint256) returns (string)');
const symbolFunction = AbiFunction.from('function symbol() returns (string)');
const staticCallFunction = AbiFunction.from('function query(address target, bytes data)');
async function simulateCalls(client, parameters) {
    const { blockNumber, blockTag, calls, stateOverrides, traceAssetChanges, traceTransfers, validation, } = parameters;
    const account = parameters.account
        ? (0, parseAccount_js_1.parseAccount)(parameters.account)
        : undefined;
    if (traceAssetChanges && !account)
        throw new base_js_1.BaseError('`account` is required when `traceAssetChanges` is true');
    const getBalanceData = account
        ? AbiConstructor.encode(AbiConstructor.from('constructor(bytes, bytes)'), {
            bytecode: contracts_js_1.deploylessCallViaBytecodeBytecode,
            args: [
                getBalanceCode,
                AbiFunction.encodeData(AbiFunction.from('function getBalance(address)'), [account.address]),
            ],
        })
        : undefined;
    const blockTag_ = blockTag ?? client.experimental_blockTag ?? 'latest';
    let baseBlockNumber = blockNumber;
    if (traceAssetChanges &&
        typeof baseBlockNumber !== 'bigint' &&
        blockTag_ !== 'earliest' &&
        blockTag_ !== 'pending') {
        if (blockTag_ === 'latest')
            baseBlockNumber = await (0, getBlockNumber_js_1.getBlockNumber)(client, { cacheTime: 0 });
        else {
            const block = await (0, getBlock_js_1.getBlock)(client, { blockTag: blockTag_ });
            if (typeof block.number !== 'bigint')
                throw new base_js_1.BaseError(`Block tag \`${blockTag_}\` did not resolve to a number.`);
            baseBlockNumber = block.number;
        }
    }
    const block_ = typeof baseBlockNumber === 'bigint'
        ? { blockNumber: baseBlockNumber }
        : { blockTag: blockTag_ };
    const discovery = traceAssetChanges
        ? await (0, simulateBlocks_js_1.simulateBlocks)(client, {
            ...block_,
            blocks: [
                {
                    calls: calls.map((call) => ({
                        ...call,
                        from: account.address,
                    })),
                    stateOverrides,
                },
            ],
            traceTransfers,
            validation,
        })
        : undefined;
    const assetAddresses = discovery
        ? [
            ...new Set([
                ...tokensFromLogs(discovery[0].calls.flatMap((call) => call.logs ?? []), account.address),
                ...parameters.calls.map((call) => call.to?.toLowerCase()),
            ]),
        ].filter((address) => Boolean(address) && address !== address_js_1.ethAddress && address !== address_js_1.zeroAddress)
        : [];
    const staticCallAddress = getStaticCallAddress([
        ...(account ? [account.address] : []),
        ...assetAddresses,
        ...(stateOverrides?.map(({ address }) => address) ?? []),
    ]);
    const staticCallStateOverrides = [
        { address: staticCallAddress, code: staticCallCode },
    ];
    const [balanceCallsPre, blocks] = await Promise.all([
        traceAssetChanges
            ? Promise.all([
                readBalance(client, {
                    account: account.address,
                    ...block_,
                    data: getBalanceData,
                    stateOverride: stateOverrides,
                }),
                ...assetAddresses.map((address) => readBalance(client, {
                    account: account.address,
                    address,
                    ...block_,
                    data: AbiFunction.encodeData(balanceOfFunction, [
                        account.address,
                    ]),
                    staticCallAddress,
                    stateOverride: stateOverrides,
                })),
            ])
            : [],
        (0, simulateBlocks_js_1.simulateBlocks)(client, {
            ...block_,
            blocks: [
                {
                    calls: [...calls, { to: address_js_1.zeroAddress }].map((call) => ({
                        ...call,
                        from: account?.address,
                    })),
                    stateOverrides,
                },
                ...(traceAssetChanges
                    ? [
                        {
                            calls: [{ data: getBalanceData }],
                        },
                        {
                            calls: assetAddresses.map((address) => ({
                                to: staticCallAddress,
                                gas: assetProbeGas,
                                data: encodeStaticCall(address, AbiFunction.encodeData(balanceOfFunction, [
                                    account.address,
                                ])),
                            })),
                            stateOverrides: staticCallStateOverrides,
                        },
                        {
                            calls: assetAddresses.map((address) => ({
                                to: staticCallAddress,
                                gas: assetProbeGas,
                                data: encodeStaticCall(address, AbiFunction.encodeData(decimalsFunction)),
                            })),
                            stateOverrides: staticCallStateOverrides,
                        },
                        {
                            calls: assetAddresses.map((address) => ({
                                to: staticCallAddress,
                                gas: assetProbeGas,
                                data: encodeStaticCall(address, AbiFunction.encodeData(tokenUriFunction, [0n])),
                            })),
                            stateOverrides: staticCallStateOverrides,
                        },
                        {
                            calls: assetAddresses.map((address) => ({
                                to: staticCallAddress,
                                gas: assetProbeGas,
                                data: encodeStaticCall(address, AbiFunction.encodeData(symbolFunction)),
                            })),
                            stateOverrides: staticCallStateOverrides,
                        },
                    ]
                    : []),
            ],
            traceTransfers,
            validation,
        }),
    ]);
    const block_results = blocks[0];
    const [block_ethPost, block_assetsPost, block_decimals, block_tokenURI, block_symbols,] = traceAssetChanges ? blocks.slice(1) : [];
    const { calls: block_calls, ...block } = block_results;
    const results = block_calls.slice(0, -1);
    const balancesPre = balanceCallsPre.map((call) => isBalance(call) ? (0, fromHex_js_1.hexToBigInt)(call.data) : null);
    const ethPost = block_ethPost?.calls ?? [];
    const assetsPost = block_assetsPost?.calls ?? [];
    const balanceCallsPost = [...ethPost, ...assetsPost];
    const balancesPost = balanceCallsPost.map((call) => isBalance(call) ? (0, fromHex_js_1.hexToBigInt)(call.data) : null);
    const decimals = (block_decimals?.calls ?? []).map((call) => decodeAssetResult(call, decimalsFunction));
    const symbols = (block_symbols?.calls ?? []).map((call) => decodeAssetResult(call, symbolFunction));
    const tokenURI = (block_tokenURI?.calls ?? []).map((call) => decodeAssetResult(call, tokenUriFunction));
    const changes = [];
    for (const [i, balancePost] of balancesPost.entries()) {
        const balancePre_ = balancesPre[i];
        const preCall = balanceCallsPre[i];
        const balancePre = typeof balancePre_ === 'bigint'
            ? balancePre_
            : i > 0 && preCall?.status === 'success' && preCall.data === '0x'
                ? 0n
                : null;
        if (typeof balancePost !== 'bigint')
            continue;
        if (typeof balancePre !== 'bigint')
            continue;
        const decimals_ = decimals[i - 1];
        const symbol_ = symbols[i - 1];
        const tokenURI_ = tokenURI[i - 1];
        const token = (() => {
            if (i === 0)
                return {
                    address: address_js_1.ethAddress,
                    decimals: 18,
                    symbol: 'ETH',
                };
            return {
                address: assetAddresses[i - 1],
                decimals: tokenURI_ || decimals_ ? Number(decimals_ ?? 1) : undefined,
                symbol: symbol_ ?? undefined,
            };
        })();
        changes.push({
            token,
            value: {
                pre: balancePre,
                post: balancePost,
                diff: balancePost - balancePre,
            },
        });
    }
    return {
        assetChanges: changes,
        block,
        results,
    };
}
function encodeStaticCall(address, data) {
    return AbiFunction.encodeData(staticCallFunction, [address, data]);
}
function tokensFromLogs(logs, account) {
    const account_ = (0, pad_js_1.pad)(account.toLowerCase(), { size: 32 });
    return logs
        .filter((log) => {
        if (log.topics[0]?.toLowerCase() !== transferEventSelector)
            return false;
        if (log.address.toLowerCase() === address_js_1.ethAddress)
            return false;
        return (log.topics[1]?.toLowerCase() === account_ ||
            log.topics[2]?.toLowerCase() === account_);
    })
        .map((log) => log.address.toLowerCase());
}
function isBalance(call) {
    return call.status === 'success' && /^0x[\da-f]{64}$/i.test(call.data);
}
function decodeAssetResult(call, abiFunction) {
    if (call.status === 'failure' || call.data === '0x')
        return null;
    try {
        return AbiFunction.decodeResult(abiFunction, call.data);
    }
    catch {
        return null;
    }
}
async function readBalance(client, parameters) {
    const { account, address, blockNumber, blockTag, data, staticCallAddress, stateOverride, } = parameters;
    try {
        const result = await (0, call_js_1.call)({ ...client, ccipRead: false }, {
            account: address ? address_js_1.zeroAddress : account,
            data: address ? encodeStaticCall(address, data) : data,
            stateOverride: address && staticCallAddress
                ? [
                    ...(stateOverride ?? []),
                    { address: staticCallAddress, code: staticCallCode },
                ]
                : stateOverride,
            ...(address ? { gas: assetProbeGas, to: staticCallAddress } : {}),
            ...(typeof blockNumber === 'bigint' ? { blockNumber } : { blockTag }),
        });
        return { data: result.data ?? '0x', status: 'success' };
    }
    catch (error) {
        if (!(error instanceof contract_js_1.CallExecutionError) ||
            !(error.cause instanceof node_js_1.ExecutionRevertedError))
            throw error;
        return { data: '0x', status: 'failure' };
    }
}
function getStaticCallAddress(addresses) {
    const occupied = new Set(addresses.map((address) => address.toLowerCase()));
    let value = staticCallAddressBase;
    while (occupied.has(`0x${value.toString(16).padStart(40, '0')}`))
        value++;
    return `0x${value.toString(16).padStart(40, '0')}`;
}
//# sourceMappingURL=simulateCalls.js.map