"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromRpc = fromRpc;
exports.toRpc = toRpc;
const Authorization = require("./Authorization.js");
const FrameRequest = require("./FrameRequest.js");
const FrameSignature = require("./FrameSignature.js");
const Hex = require("./Hex.js");
const FrameNonce = require("./internal/frameNonce.js");
const Transaction = require("./Transaction.js");
function fromRpc(request) {
    const request_ = { ...request };
    if (typeof request.authorizationList !== 'undefined')
        request_.authorizationList = Authorization.fromRpcList(request.authorizationList);
    if (typeof request.chainId !== 'undefined')
        request_.chainId = Hex.toNumber(request.chainId);
    if (request.frames)
        request_.frames = request.frames.map(FrameRequest.fromRpc);
    if (request.signatures)
        request_.signatures = request.signatures.map(FrameSignature.fromRpc);
    if (typeof request.gas !== 'undefined')
        request_.gas = Hex.toBigInt(request.gas);
    if (typeof request.gasPrice !== 'undefined')
        request_.gasPrice = Hex.toBigInt(request.gasPrice);
    if (typeof request.maxFeePerBlobGas !== 'undefined')
        request_.maxFeePerBlobGas = Hex.toBigInt(request.maxFeePerBlobGas);
    if (typeof request.maxFeePerGas !== 'undefined')
        request_.maxFeePerGas = Hex.toBigInt(request.maxFeePerGas);
    if (typeof request.maxPriorityFeePerGas !== 'undefined')
        request_.maxPriorityFeePerGas = Hex.toBigInt(request.maxPriorityFeePerGas);
    if (typeof request.nonce !== 'undefined')
        request_.nonce = Hex.toBigInt(request.nonce);
    if (request.nonceKeys !== undefined)
        request_.nonceKeys = FrameNonce.fromRpc(request.nonceKeys, request.nonce);
    if (typeof request.type !== 'undefined')
        request_.type =
            Transaction.fromRpcType[request.type] || request.type;
    if (typeof request.value !== 'undefined')
        request_.value = Hex.toBigInt(request.value);
    return request_;
}
function toRpc(request) {
    const request_rpc = {};
    if (typeof request.accessList !== 'undefined')
        request_rpc.accessList = request.accessList;
    if (typeof request.authorizationList !== 'undefined')
        request_rpc.authorizationList = Authorization.toRpcList(request.authorizationList);
    if (typeof request.blobVersionedHashes !== 'undefined')
        request_rpc.blobVersionedHashes = request.blobVersionedHashes;
    if (typeof request.blobs !== 'undefined')
        request_rpc.blobs = request.blobs;
    if (typeof request.chainId !== 'undefined')
        request_rpc.chainId = Hex.fromNumber(request.chainId);
    if (typeof request.data !== 'undefined') {
        request_rpc.data = request.data;
        request_rpc.input = request.data;
    }
    else if (typeof request.input !== 'undefined') {
        request_rpc.data = request.input;
        request_rpc.input = request.input;
    }
    if (typeof request.from !== 'undefined')
        request_rpc.from = request.from;
    if (request.frames)
        request_rpc.frames = request.frames.map(FrameRequest.toRpc);
    if (request.signatures)
        request_rpc.signatures = request.signatures.map(FrameSignature.toRpc);
    if (typeof request.gas !== 'undefined')
        request_rpc.gas = Hex.fromNumber(request.gas);
    if (typeof request.gasPrice !== 'undefined')
        request_rpc.gasPrice = Hex.fromNumber(request.gasPrice);
    if (typeof request.maxFeePerBlobGas !== 'undefined')
        request_rpc.maxFeePerBlobGas = Hex.fromNumber(request.maxFeePerBlobGas);
    if (typeof request.maxFeePerGas !== 'undefined')
        request_rpc.maxFeePerGas = Hex.fromNumber(request.maxFeePerGas);
    if (typeof request.maxPriorityFeePerGas !== 'undefined')
        request_rpc.maxPriorityFeePerGas = Hex.fromNumber(request.maxPriorityFeePerGas);
    if (typeof request.maxPriorityFeePerGas !== 'undefined')
        request_rpc.maxPriorityFeePerGas = Hex.fromNumber(request.maxPriorityFeePerGas);
    if (typeof request.nonce !== 'undefined')
        request_rpc.nonce = Hex.fromNumber(request.nonce);
    if (request.nonceKeys !== undefined)
        request_rpc.nonceKeys = FrameNonce.toRpc(request.nonceKeys, request.nonce);
    if (typeof request.to !== 'undefined')
        request_rpc.to = request.to;
    if (typeof request.type !== 'undefined')
        request_rpc.type =
            Transaction.toRpcType[request.type] || request.type;
    if (typeof request.value !== 'undefined')
        request_rpc.value = Hex.fromNumber(request.value);
    return request_rpc;
}
//# sourceMappingURL=TransactionRequest.js.map