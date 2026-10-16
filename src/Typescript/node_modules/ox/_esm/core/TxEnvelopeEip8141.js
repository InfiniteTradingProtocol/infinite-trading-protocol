import * as Address from './Address.js';
import * as Blobs from './Blobs.js';
import * as Bytes from './Bytes.js';
import * as Errors from './Errors.js';
import * as Frame from './Frame.js';
import * as FrameSignature from './FrameSignature.js';
import * as Hash from './Hash.js';
import * as Hex from './Hex.js';
import * as FrameNonce from './internal/frameNonce.js';
import * as Quantity from './internal/quantity.js';
import * as Rlp from './Rlp.js';
/** Serialized EIP-8141 transaction type prefix. */
export const serializedType = '0x06';
/** EIP-8141 transaction type. */
export const type = 'eip8141';
/**
 * Asserts that an EIP-8141 envelope satisfies structural transaction constraints.
 *
 * Accepts unsigned signature entries for construction. Does not verify signatures,
 * account authorization, balances, or blob proofs.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { TxEnvelopeEip8141 } from 'ox'
 *
 * TxEnvelopeEip8141.assert({
 *   chainId: 1,
 *   frames: [{ executionGas: 50_000n, mode: 'verify' }],
 *   sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 * })
 * ```
 *
 * @param envelope - The transaction envelope to assert.
 */
export function assert(envelope) {
    const { blobVersionedHashes = [], chainId, frames, maxFeePerBlobGas = 0n, maxFeePerGas = 0n, maxPriorityFeePerGas = 0n, nonce = 0n, nonceKeys, sender, signatures = [], } = envelope;
    if ((typeof chainId !== 'bigint' &&
        (typeof chainId !== 'number' || !Number.isSafeInteger(chainId))) ||
        BigInt(chainId) < 0n ||
        BigInt(chainId) >= 2n ** 256n)
        throw new InvalidError('chainId must be an unsigned 256-bit integer; use bigint for large IDs.');
    if (nonceKeys !== undefined)
        FrameNonce.assert(nonceKeys, nonce);
    Address.assert(sender, { strict: false });
    for (const [field, value, bits] of [
        ['maxFeePerBlobGas', maxFeePerBlobGas, 256n],
        ['maxFeePerGas', maxFeePerGas, 256n],
        ['maxPriorityFeePerGas', maxPriorityFeePerGas, 256n],
        ['nonce', nonce, 64n],
    ])
        if (typeof value !== 'bigint' || value < 0n || value >= 2n ** bits)
            throw new InvalidError(`${field} must be an unsigned ${bits}-bit integer.`);
    if (maxPriorityFeePerGas > maxFeePerGas)
        throw new InvalidError('maxPriorityFeePerGas exceeds maxFeePerGas.');
    if (!Array.isArray(frames) || frames.length === 0 || frames.length > 64)
        throw new InvalidError('Expected between 1 and 64 frames.');
    if (!Array.isArray(signatures) || !Array.isArray(blobVersionedHashes))
        throw new InvalidError('Signatures and blob versioned hashes must be lists.');
    for (const hash of blobVersionedHashes) {
        Hex.assert(hash, { strict: true });
        if (hash.length !== 66 || Hex.slice(hash, 0, 1) !== '0x01')
            throw new InvalidError('Blob versioned hashes must contain 32 bytes and version 0x01.');
    }
    if (blobVersionedHashes.length === 0 && maxFeePerBlobGas !== 0n)
        throw new InvalidError('maxFeePerBlobGas must be zero without blobs.');
    let executionGas = 0n;
    let stateGas = 0n;
    let previousBatch = false;
    let expiry = false;
    let tokens = 0n;
    let size = 0n;
    let intrinsic = 12000n + BigInt(frames.length) * 475n;
    const count = (data) => {
        for (const byte of Hex.toBytes(data))
            tokens += byte === 0 ? 1n : 4n;
        size += BigInt(Hex.size(data));
    };
    if (nonceKeys !== undefined) {
        count(Rlp.fromHex(nonceKeys.map((key) => key === 0n ? '0x' : Hex.fromBytes(Bytes.fromNumber(key)))));
        count(Rlp.fromHex(nonce === 0n ? '0x' : Hex.fromBytes(Bytes.fromNumber(nonce))));
    }
    for (const [index, frame] of frames.entries()) {
        Frame.assert(frame);
        const flags = typeof frame.flags === 'string'
            ? Frame.flags[frame.flags]
            : (frame.flags ?? 0);
        const batch = (flags & 4) !== 0;
        if (flags & 2 &&
            frame.to !== undefined &&
            !Address.isEqual(frame.to, sender))
            throw new InvalidError('Execution approval must target the sender.');
        if ((batch || previousBatch) && flags & 3)
            throw new InvalidError('Atomic batches cannot contain approval frames.');
        if (batch) {
            const next = frames[index + 1];
            if (!next || next.mode === 1 || next.mode === 'verify')
                throw new InvalidError('An atomic batch requires a following non-verify frame.');
        }
        previousBatch = batch;
        if ((frame.mode === 1 || frame.mode === 'verify') &&
            frame.to?.toLowerCase() === '0x0000000000000000000000000000000000008141') {
            if (expiry ||
                flags !== 0 ||
                (frame.stateGas ?? 0n) !== 0n ||
                Hex.size(frame.data ?? '0x') !== 8)
                throw new InvalidError('Invalid or duplicate expiry verifier frame.');
            expiry = true;
        }
        executionGas += frame.executionGas ?? 0n;
        stateGas += frame.stateGas ?? 0n;
        count(frame.data ?? '0x');
        if ((frame.value ?? 0n) > 0n &&
            frame.to !== undefined &&
            !Address.isEqual(frame.to, sender))
            intrinsic += 6000n;
    }
    for (const entry of signatures) {
        const [scheme, signer, payload, signature] = FrameSignature.toTuple(entry);
        intrinsic += scheme === '0x' ? 100n : scheme === '0x01' ? 2800n : 6700n;
        count(signer);
        count(payload);
        count(signature);
    }
    if (executionGas + stateGas >= 2n ** 64n)
        throw new InvalidError('Combined frame gas must be less than 2^64.');
    if (intrinsic + tokens * 4n + executionGas > 16777216n ||
        intrinsic + size * 64n > 16777216n)
        throw new InvalidError('Transaction execution gas exceeds 16777216.');
}
/**
 * Deserializes an EIP-8141 transaction body or PeerDAS network wrapper.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { Frame, TxEnvelopeEip8141 } from 'ox'
 *
 * const envelope = TxEnvelopeEip8141.from({
 *   chainId: 1,
 *   frames: [Frame.from({})],
 *   sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 * })
 *
 * const serialized = TxEnvelopeEip8141.serialize(envelope)
 * const decoded = TxEnvelopeEip8141.deserialize(serialized)
 * ```
 *
 * @param serialized - Serialized transaction or network wrapper.
 * @returns The transaction envelope.
 */
export function deserialize(serialized) {
    Hex.assert(serialized, { strict: true });
    if (Hex.slice(serialized, 0, 1) !== serializedType)
        throw new InvalidError('Expected transaction type 0x06.');
    const decoded = Rlp.toHex(Hex.slice(serialized, 1));
    if (!Array.isArray(decoded))
        throw new InvalidError('Expected a transaction list.');
    const wrapped = Array.isArray(decoded[0]);
    const body = wrapped ? decoded[0] : decoded;
    if (!Array.isArray(body) || (body.length !== 7 && body.length !== 8))
        throw new InvalidError('Expected seven or eight transaction fields.');
    const keyed = body.length === 8;
    const [chainId, ...fields] = body;
    const keys = keyed ? fields.shift() : undefined;
    if (keyed && !Array.isArray(keys))
        throw new InvalidError('Expected a nonce key list.');
    const [nonce, sender, frames, signatures, fees, hashes] = fields;
    if (typeof sender !== 'string' ||
        !Array.isArray(frames) ||
        !Array.isArray(signatures) ||
        !Array.isArray(fees) ||
        fees.length !== 3 ||
        !Array.isArray(hashes) ||
        hashes.some((hash) => typeof hash !== 'string'))
        throw new InvalidError('Invalid transaction field shape.');
    const integer = (value) => {
        if (typeof value !== 'string' ||
            (value !== '0x' && value.startsWith('0x00')))
            throw new InvalidError('Expected a minimally encoded integer.');
        return value === '0x' ? 0n : Hex.toBigInt(value);
    };
    const id = integer(chainId);
    const envelope = {
        blobVersionedHashes: hashes,
        chainId: id <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(id) : id,
        frames: frames.map((frame) => Frame.fromTuple(frame)),
        maxFeePerBlobGas: integer(fees[2]),
        maxFeePerGas: integer(fees[1]),
        maxPriorityFeePerGas: integer(fees[0]),
        nonce: integer(nonce),
        ...(Array.isArray(keys) ? { nonceKeys: keys.map(integer) } : {}),
        sender: sender,
        signatures: signatures.map((entry) => FrameSignature.fromTuple(entry)),
        type,
    };
    if (wrapped) {
        if (decoded.length !== 5 ||
            decoded[1] !== '0x01' ||
            !Array.isArray(decoded[2]) ||
            !Array.isArray(decoded[3]) ||
            !Array.isArray(decoded[4]))
            throw new InvalidError('Expected a version 1 PeerDAS wrapper.');
        envelope.sidecars = {
            blobs: decoded[2],
            cellProofs: decoded[4],
            commitments: decoded[3],
        };
    }
    assert(envelope);
    // Re-encoding rejects nonminimal RLP lengths as well as malformed nested lists.
    if (serialize(envelope).toLowerCase() !== serialized.toLowerCase())
        throw new InvalidError('Noncanonical transaction encoding.');
    return envelope;
}
/**
 * Creates an EIP-8141 transaction envelope from an object or serialized transaction.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { TxEnvelopeEip8141 } from 'ox'
 *
 * const envelope = TxEnvelopeEip8141.from({
 *   chainId: 1,
 *   frames: [
 *     {
 *       executionGas: 50_000n,
 *       flags: 'approveExecutionAndPayment',
 *       mode: 'verify'
 *     }
 *   ],
 *   sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 * })
 * ```
 *
 * @param envelope - An envelope object or serialized transaction.
 * @returns The envelope with its transaction type.
 */
export function from(envelope) {
    const value = (typeof envelope === 'string' ? deserialize(envelope) : envelope);
    assert(value);
    return { ...value, type };
}
/**
 * Converts an RPC envelope to an EIP-8141 envelope without losing chain ID precision.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { Frame, TxEnvelopeEip8141 } from 'ox'
 *
 * const rpc = TxEnvelopeEip8141.toRpc(
 *   TxEnvelopeEip8141.from({
 *     chainId: 1,
 *     frames: [Frame.from({})],
 *     sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 *   })
 * )
 * const envelope = TxEnvelopeEip8141.fromRpc(rpc)
 * ```
 *
 * @param envelope - The value to convert.
 * @returns The converted value.
 */
export function fromRpc(envelope) {
    const chainId = Hex.toBigInt(envelope.chainId);
    return from({
        blobVersionedHashes: envelope.blobVersionedHashes,
        chainId: chainId <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(chainId) : chainId,
        frames: envelope.frames.map(Frame.fromRpc),
        maxFeePerBlobGas: Hex.toBigInt(envelope.maxFeePerBlobGas),
        maxFeePerGas: Hex.toBigInt(envelope.maxFeePerGas),
        maxPriorityFeePerGas: Hex.toBigInt(envelope.maxPriorityFeePerGas),
        nonce: Hex.toBigInt(envelope.nonce),
        ...(envelope.nonceKeys !== undefined
            ? { nonceKeys: FrameNonce.fromRpc(envelope.nonceKeys, envelope.nonce) }
            : {}),
        sender: envelope.from,
        signatures: envelope.signatures.map(FrameSignature.fromRpc),
    });
}
/**
 * Converts an EIP-8141 envelope to RPC fields. Sidecars are excluded.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { Frame, TxEnvelopeEip8141 } from 'ox'
 *
 * const envelope = TxEnvelopeEip8141.from({
 *   chainId: 1,
 *   frames: [Frame.from({})],
 *   sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 * })
 * const rpc = TxEnvelopeEip8141.toRpc(envelope)
 * ```
 *
 * @param envelope - The value to convert.
 * @returns The converted value.
 */
export function toRpc(envelope) {
    return {
        blobVersionedHashes: envelope.blobVersionedHashes ?? [],
        chainId: Quantity.fromNumberish(envelope.chainId),
        frames: envelope.frames.map(Frame.toRpc),
        from: envelope.sender,
        maxFeePerBlobGas: Quantity.fromNumberish(envelope.maxFeePerBlobGas ?? 0n),
        maxFeePerGas: Quantity.fromNumberish(envelope.maxFeePerGas ?? 0n),
        maxPriorityFeePerGas: Quantity.fromNumberish(envelope.maxPriorityFeePerGas ?? 0n),
        nonce: Quantity.fromNumberish(envelope.nonce ?? 0n),
        ...(envelope.nonceKeys !== undefined
            ? { nonceKeys: FrameNonce.toRpc(envelope.nonceKeys, envelope.nonce) }
            : {}),
        signatures: (envelope.signatures ?? []).map(FrameSignature.toRpc),
        type: '0x6',
    };
}
/**
 * Returns the canonical signing payload of an EIP-8141 envelope.
 *
 * Elides signature bytes only for entries with an empty payload. Explicit-payload
 * signatures remain committed. The envelope is not mutated.
 *
 * @example
 * ### Signing
 *
 * ```ts twoslash
 * import {
 *   Address,
 *   FrameSignature,
 *   Secp256k1,
 *   TxEnvelopeEip8141
 * } from 'ox'
 *
 * const privateKey = Secp256k1.randomPrivateKey()
 * const sender = Address.fromPublicKey(
 *   Secp256k1.getPublicKey({ privateKey })
 * )
 * const envelope = TxEnvelopeEip8141.from({
 *   chainId: 1,
 *   frames: [
 *     {
 *       executionGas: 50_000n,
 *       flags: 'approveExecutionAndPayment',
 *       mode: 'verify'
 *     }
 *   ],
 *   sender,
 *   signatures: [FrameSignature.from({ scheme: 'secp256k1' })]
 * })
 *
 * const payload = TxEnvelopeEip8141.getSignPayload(envelope)
 * const signature = Secp256k1.sign({ payload, privateKey })
 * const signed = TxEnvelopeEip8141.from({
 *   ...envelope,
 *   signatures: [
 *     FrameSignature.from({ scheme: 'secp256k1', signature })
 *   ]
 * })
 * ```
 *
 * @param envelope - The transaction envelope to sign.
 * @returns The canonical signing digest.
 */
export function getSignPayload(envelope) {
    return hash(envelope, { presign: true });
}
/**
 * Hashes an EIP-8141 transaction, excluding its blob sidecars.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { Frame, TxEnvelopeEip8141 } from 'ox'
 *
 * const hash = TxEnvelopeEip8141.hash({
 *   chainId: 1,
 *   frames: [Frame.from({})],
 *   sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 * })
 * ```
 *
 * @param envelope - The transaction envelope to hash.
 * @param options - Hashing options.
 * @returns The transaction hash or signing digest.
 */
export function hash(envelope, options = {}) {
    assert(envelope);
    const body = toTuple(envelope);
    if (options.presign) {
        const signatures = body.length === 8 ? body[5] : body[4];
        for (const [index, entry] of signatures.entries())
            if (entry[2] === '0x')
                signatures[index] = [entry[0], entry[1], entry[2], '0x'];
    }
    return Hash.keccak256(Hex.concat(serializedType, Rlp.fromHex(body)));
}
/**
 * Serializes an EIP-8141 envelope, including a PeerDAS wrapper when sidecars exist.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { TxEnvelopeEip8141 } from 'ox'
 *
 * const envelope = TxEnvelopeEip8141.from({
 *   chainId: 1,
 *   frames: [{ executionGas: 50_000n, mode: 'sender' }],
 *   sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 * })
 * const serialized = TxEnvelopeEip8141.serialize(envelope)
 * ```
 *
 * @param envelope - The transaction envelope to serialize.
 * @returns The serialized transaction.
 */
export function serialize(envelope) {
    assert(envelope);
    const body = toTuple(envelope);
    const { sidecars } = envelope;
    if (sidecars) {
        const { blobs, cellProofs, commitments } = sidecars;
        const hashes = envelope.blobVersionedHashes ?? [];
        if (hashes.length === 0 ||
            blobs.length !== hashes.length ||
            commitments.length !== hashes.length ||
            cellProofs.length !== hashes.length * 128)
            throw new InvalidError('PeerDAS sidecar counts do not match blob hashes.');
        for (const [index, blob] of blobs.entries()) {
            Hex.assert(blob, { strict: true });
            const commitment = commitments[index];
            Hex.assert(commitment, { strict: true });
            if (blob.length !== 2 + Blobs.bytesPerBlob * 2 ||
                commitment.length !== 98 ||
                Blobs.commitmentToVersionedHash(commitment).toLowerCase() !==
                    hashes[index].toLowerCase())
                throw new InvalidError('Invalid blob size or commitment.');
        }
        for (const proof of cellProofs) {
            Hex.assert(proof, { strict: true });
            if (proof.length !== 98)
                throw new InvalidError('Cell proofs must contain 48 bytes.');
        }
        return Hex.concat(serializedType, Rlp.fromHex([body, '0x01', blobs, commitments, cellProofs]));
    }
    return Hex.concat(serializedType, Rlp.fromHex(body));
}
/**
 * Returns whether an EIP-8141 envelope satisfies structural constraints.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts twoslash
 * import { Frame, TxEnvelopeEip8141 } from 'ox'
 *
 * const valid = TxEnvelopeEip8141.validate({
 *   chainId: 1,
 *   frames: [Frame.from({})],
 *   sender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
 * })
 * ```
 *
 * @param envelope - The transaction envelope to validate.
 * @returns Whether the envelope is structurally valid.
 */
export function validate(envelope) {
    try {
        assert(envelope);
        return true;
    }
    catch {
        return false;
    }
}
/** Thrown when an EIP-8141 envelope is structurally invalid. */
export class InvalidError extends Errors.BaseError {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'TxEnvelopeEip8141.InvalidError'
        });
    }
}
function toTuple(envelope) {
    const quantity = (value) => value ? Hex.fromBytes(Bytes.fromNumber(value)) : '0x';
    const fields = [
        quantity(envelope.nonce),
        envelope.sender,
        envelope.frames.map((frame) => Frame.toTuple(frame)),
        (envelope.signatures ?? []).map((entry) => FrameSignature.toTuple(entry)),
        [
            quantity(envelope.maxPriorityFeePerGas),
            quantity(envelope.maxFeePerGas),
            quantity(envelope.maxFeePerBlobGas),
        ],
        envelope.blobVersionedHashes ?? [],
    ];
    return envelope.nonceKeys === undefined
        ? [quantity(envelope.chainId), ...fields]
        : [
            quantity(envelope.chainId),
            envelope.nonceKeys.map(quantity),
            ...fields,
        ];
}
//# sourceMappingURL=TxEnvelopeEip8141.js.map