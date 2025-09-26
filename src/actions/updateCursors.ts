import { Cursor, Room } from "../types.js";
import { normalizeCursors } from "./normalizeCursors.js";

const COLORS = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8",
    "#f58231", "#911eb4", "#46f0f0", "#f032e6",
    "#bcf60c", "#fabebe", "#008080", "#e6beff",
    "#9a6324", "#fffac8", "#800000", "#aaffc3",
    "#808000", "#ffd8b1", "#000075", "#808080"
];

function assignColor(userId: string, room: Room): string {
    const existing = room.cursors.find(c => c.userId === userId)?.color;
    if (existing) return existing;

    const usedColors = room.cursors.map(c => c.color).filter(Boolean);
    const available = COLORS.find(c => !usedColors.includes(c));
    return available ?? COLORS[Math.floor(Math.random() * COLORS.length)];
}

export const updateCursors = (room: Room, cursor: Cursor, userId: string) => {
    cursor.userId = cursor.userId ?? userId;

    const cursorIndex = room.cursors.findIndex(c => c.userId === cursor.userId);

    if (cursorIndex >= 0) {
        cursor.color = room.cursors[cursorIndex].color ?? assignColor(cursor.userId, room);
        room.cursors[cursorIndex] = cursor;
    } else {
        cursor.color = assignColor(cursor.userId, room);
        room.cursors.push(cursor);
    }

    normalizeCursors(room.cursors, room.blocks);
    return cursor;
}
