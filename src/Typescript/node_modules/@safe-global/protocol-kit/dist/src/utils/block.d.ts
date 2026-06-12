import { BlockTag } from 'viem';
export declare function asBlockId(blockId: number | string | undefined): {
    blockNumber: any;
} | {
    blockTag: BlockTag;
};
