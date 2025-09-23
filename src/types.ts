export interface Block {
    id: number;
    text: string;
}

export interface Cursor {
    userId: string;
    blockId: number;
    position: number;
    selectionEnd?: number;
    color: string;
}

export interface Room {
    id: string;
    blocks: Block[];
    cursors: Cursor[];
}
