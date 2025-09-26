import { Block } from "../types.js";

export const deleteBlocks = (blocks: Block[], deleted: Block[]) => {

    deleted.forEach(item => {
        const index = blocks.findIndex(block => block.id === item.id);
        if (index >= 0) {
            blocks.splice(index, 1);
        }
    });

    return blocks;
}