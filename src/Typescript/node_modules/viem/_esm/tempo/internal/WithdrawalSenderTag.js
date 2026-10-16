import { AbiParameters, Hash } from 'ox';
/** Derives a user withdrawal sender tag. @internal */
export function from(options) {
    const { fallbackNonce, sender, transactionHash } = options;
    return Hash.keccak256(AbiParameters.encodePacked(['address', 'bytes32', 'uint64'], [sender, transactionHash, fallbackNonce]));
}
//# sourceMappingURL=WithdrawalSenderTag.js.map