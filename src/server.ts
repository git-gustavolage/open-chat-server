import express from "express";
import http from "http";
import { Server } from "socket.io";
import routes from "./routes/v1/index.ts";
import dotenv from 'dotenv'
import { RoomRepositoryFs } from "./repositories/RoomRepositoryFs.ts";
import { RoomManager } from "./services/RoomManager.ts";

dotenv.config();

interface Block {
    id: number;
    text: string;
}

interface Cursor {
    userId: string;
    blockId: number;
    position: number;
    selectionEnd?: number;
    color: string;
}

interface Room {
    id: string;
    blocks: Block[];
    cursors: Cursor[];
}

const COLORS = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8",
    "#f58231", "#911eb4", "#46f0f0", "#f032e6",
    "#bcf60c", "#fabebe", "#008080", "#e6beff",
    "#9a6324", "#fffac8", "#800000", "#aaffc3",
    "#808000", "#ffd8b1", "#000075", "#808080"
];

const app = express();

app.use(express.json());

app.use("/api/v1/", routes);

function assignColor(userId: string, room: Room): string {
    const existing = room.cursors.find(c => c.userId === userId)?.color;
    if (existing) return existing;

    const usedColors = room.cursors.map(c => c.color).filter(Boolean);
    const available = COLORS.find(c => !usedColors.includes(c));
    return available ?? COLORS[Math.floor(Math.random() * COLORS.length)];
}

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

const repo = new RoomRepositoryFs();
const roomManager = new RoomManager(repo);

io.on("connection", async (socket) => {
    const { roomId, userId } = socket.handshake.query as { roomId: string; userId: string };
    console.log(`New connection: roomId=${roomId}, userId=${userId}`);

    if (!roomId || !userId) {
        socket.disconnect();
        return;
    }

    const room = await roomManager.getRoom(roomId);
    socket.join(roomId);

    const validateAllCursors = () => {
        room.cursors = room.cursors.map(cursor => {
            let blockIndex = room.blocks.findIndex(b => b.id === cursor.blockId);

            if (blockIndex === -1) {
                // Se o bloco sumiu, pega o último bloco válido
                if (room.blocks.length > 0) {
                    blockIndex = room.blocks.length - 1;
                    cursor.blockId = room.blocks[blockIndex].id;
                    cursor.position = room.blocks[blockIndex].text.length;
                } else {
                    // Se não existe nenhum bloco, zera o cursor
                    cursor.blockId = null as any;
                    cursor.position = 0;
                    return cursor;
                }
            }

            const block = room.blocks[blockIndex];

            // Ajusta posição fora dos limites
            if (cursor.position > block.text.length) {
                cursor.position = block.text.length;
            }
            if (cursor.position < 0) {
                cursor.position = 0;
            }

            return cursor;
        });
    };

    const updateCursors = (cursor: Cursor) => {
        cursor.userId = cursor.userId ?? userId;

        const cursorIndex = room.cursors.findIndex(c => c.userId === cursor.userId);

        if (cursorIndex >= 0) {
            cursor.color = room.cursors[cursorIndex].color ?? assignColor(cursor.userId, room);
            room.cursors[cursorIndex] = cursor;
        } else {
            cursor.color = assignColor(cursor.userId, room);
            room.cursors.push(cursor);
        }

        return cursor;
    };

    async function cleanDisconnectedCursors(roomId: string, room: Room) {
        const connectedSockets = io.sockets.adapter.rooms.get(roomId);

        if (!connectedSockets) {
            room.cursors = [];
            await roomManager.saveRoom(room);
            return;
        }

        const activeUserIds = new Set<string>();
        for (const socketId of connectedSockets) {
            const s = io.sockets.sockets.get(socketId);
            if (s && s.handshake.query.userId) {
                activeUserIds.add(s.handshake.query.userId as string);
            }
        }

        room.cursors = room.cursors.filter(cursor =>
            activeUserIds.has(cursor.userId)
        );

        await roomManager.saveRoom(room);
    }

    socket.on("load", async () => {
        console.log("Sending room data: ", room);

        await cleanDisconnectedCursors(roomId, room);

        const data = {
            blocks: room.blocks,
            cursors: room.cursors
        }

        socket.emit("init", { data });
    })

    socket.on("change", async ({ target, cursor }) => {
        console.log(`[CHANGE] Change received from ${userId} in room ${roomId}:`, target, cursor);

        const idx = room.blocks.findIndex(b => b.id === target.id);
        if (idx === -1) {
            room.blocks.push(target);
        } else {
            room.blocks[idx] = target;
        }

        cursor = updateCursors(cursor);
        validateAllCursors();

        await roomManager.saveRoom(room);

        const updatedBlocks = room.blocks
        const updatedCursors = [cursor]

        socket.to(roomId).emit("change", { updatedBlocks, updatedCursors, userId });
    });

    socket.on("enter", async ({ cursor, target, blocks }) => {
        console.log(`[ENTER] event received from ${userId} in room ${roomId}:`, cursor, target, blocks);

        const index = room.blocks.findIndex(block => block.id === target.id);
        if (index >= 0) {
            room.blocks[index] = target;
        }

        room.blocks.splice(index + 1, 0, blocks[0]);

        cursor = updateCursors(cursor);
        validateAllCursors();

        await roomManager.saveRoom(room);

        const updatedBlocks = room.blocks
        const updatedCursors = [cursor]

        socket.to(roomId).emit("change", { updatedBlocks, updatedCursors, userId });
    });

    socket.on("backspace", async ({ cursor, target, blocks }) => {
        console.log(`[BACKSPACE] event received from ${userId} in room ${roomId}:`, cursor, target, blocks);

        const index = room.blocks.findIndex(block => block.id === target.id);

        if (index >= 0) {
            const prev = room.blocks[index - 1];
            if (prev) {
                room.blocks[index - 1] = blocks[0];
                room.blocks.splice(index, 1);
            }
        }

        cursor = updateCursors(cursor);
        validateAllCursors();

        await roomManager.saveRoom(room);

        const updatedBlocks = room.blocks
        const updatedCursors = [cursor]

        socket.to(roomId).emit("change", { updatedBlocks, updatedCursors, userId });
    });

    socket.on("delete", async ({ cursor, target, blocks }) => {
        console.log(`[DELETE] event received from ${userId} in room ${roomId}:`, cursor, target, blocks);

        const index = room.blocks.findIndex(block => block.id === target.id);

        if (index >= 0) {
            room.blocks[index] = target;
            const nextIndex = room.blocks.findIndex(block => block.id == blocks[0].id);
            if (nextIndex >= 0) {
                room.blocks.splice(nextIndex, 1);
            }
        }

        cursor = updateCursors(cursor);
        validateAllCursors();

        await roomManager.saveRoom(room);

        const updatedBlocks = room.blocks
        const updatedCursors = [cursor]

        socket.to(roomId).emit("change", { updatedBlocks, updatedCursors, userId });
    });

    socket.on("arrowUp", () => {

    })

    socket.on("disconnect", async () => {
        console.log(`Client ${userId} disconnected from room ${roomId}`);

        const cursorIndex = room.cursors.findIndex(c => c.userId == userId);
        room.cursors.splice(cursorIndex, 1);

        await roomManager.saveRoom(room);

        socket.to(roomId).emit("cursor:remove", userId);

        if (io.sockets.adapter.rooms.get(roomId)?.size === 0) {
            roomManager.forget(roomId);
        }
    });
});

server.listen(process.env.APP_PORT, () => console.log(`Server now running...`));