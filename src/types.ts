export interface Block {
    id: string;
    text: string;
}

export interface Cursor {
    userId: string;
    blockId: string;
    position: number;
    selectionEnd?: number;
    color: string;
}

export interface Room {
    id: string;
    blocks: Block[];
    cursors: Cursor[];
}

export interface Register {
    created?: Block[] | null;
    updated?: Block[] | null;
    deleted?: Block[] | null;
}

export type Actions = "change" | "enter" | "backspace" | "delete" | "arrowUp" | "arrowDown" | "arrowLeft" | "arrowRight";

export interface ActionPerformed {
    action: Actions;
    cursor: Cursor;
    target_id: Block["id"];
    register: Register;
}