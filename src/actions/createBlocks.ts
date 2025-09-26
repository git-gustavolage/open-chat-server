import { Block } from "../types.js";

export const createBlocks = (blocks: Block[], created: Block[], start: number) => {

    created?.forEach((item, i) => {
        blocks.splice(start + i + 1, 0, item);
    });

    return blocks;
}