import { Block } from "../types.js";

export const updateBlocks = (blocks: Block[], updated: Block[]) => {

    updated.forEach(item => {
        const index = blocks.findIndex(block => block.id === item.id);

        if (index === -1) {
            blocks.push(item);
        } else {
            blocks[index] = item;
        }
    });

    return blocks;
}