import { Block, Cursor } from "../types.js";

export const normalizeCursors = (cursors: Cursor[], blocks: Block[]) => {
    const tempBlocks = blocks = [...blocks];
    const tempCursors = [...cursors];

    cursors = tempCursors.map(cursor => {
        let blockIndex = tempBlocks.findIndex(b => b.id === cursor.blockId);

        if (blockIndex === -1) {
            if (tempBlocks.length > 0) {
                blockIndex = tempBlocks.length - 1;
                cursor.blockId = tempBlocks[blockIndex].id;
                cursor.position = tempBlocks[blockIndex].text.length;
            } else {
                cursor.blockId = null as any;
                cursor.position = 0;
                return cursor;
            }
        }

        const block = tempBlocks[blockIndex];

        if (cursor.position > block.text.length) {
            cursor.position = block.text.length;
        }
        if (cursor.position < 0) {
            cursor.position = 0;
        }

        return cursor;
    });
};