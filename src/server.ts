import express from "express";
import http from "http";
import { Server } from "socket.io";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

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
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
    console.log(`Creating data directory at: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadRoom(roomId: string): Room {
    const filePath = path.join(DATA_DIR, `${roomId}.json`);
    console.log(`Attempting to load room ${roomId} from file: ${filePath}`);
    if (!fs.existsSync(filePath)) {
        console.log(`No file found for room ${roomId}, initializing new room`);
        return { id: roomId, blocks: [], cursors: [] };
    }
    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        console.log(`Successfully read file for room ${roomId}, parsing JSON`);
        const room = JSON.parse(raw) as Room;
        console.log(`Loaded room ${roomId}`);
        return room;
    } catch (error) {
        console.error(`Error loading room ${roomId} from ${filePath}:`, error);
        return { id: roomId, blocks: [], cursors: [] };
    }
}

function saveRoom(room: Room) {
    const filePath = path.join(DATA_DIR, `${room.id}.json`);
    try {
        fs.writeFileSync(filePath, JSON.stringify(room, null, 2));
    } catch (error) {
        console.error(`Error saving room ${room.id} to ${filePath}:`, error);
    }
}

function assignColor(userId: string, room: Room): string {
    // já tem cor?
    const existing = room.cursors.find(c => c.userId === userId)?.color;
    if (existing) return existing;

    // tenta pegar uma cor não usada ainda
    const usedColors = room.cursors.map(c => c.color).filter(Boolean);
    const available = COLORS.find(c => !usedColors.includes(c));
    return available ?? COLORS[Math.floor(Math.random() * COLORS.length)];
}

const rooms: Record<string, Room> = {};

app.post("/rooms", (req, res) => {
    const { roomId } = req.body;
    console.log(`POST /rooms received with roomId: ${roomId}`);

    if (!roomId || typeof roomId !== "string") {
        console.warn(`Invalid roomId in POST /rooms: ${roomId}`);
        return res.status(400).json({ error: "roomId is required and must be a string" });
    }

    if (rooms[roomId] || fs.existsSync(path.join(DATA_DIR, `${roomId}.json`))) {
        console.warn(`Room ${roomId} already exists`);
        return res.status(409).json({ error: `Room ${roomId} already exists` });
    }

    rooms[roomId] = { id: roomId, blocks: [], cursors: [] };
    saveRoom(rooms[roomId]);
    console.log(`Created new room ${roomId}`);
    res.status(201).json({ message: `Room ${roomId} created successfully` });
});

app.get("/rooms/:roomId", (req, res) => {
    const { roomId } = req.params;
    console.log(`GET /rooms/${roomId} received`);

    if (!rooms[roomId]) {
        rooms[roomId] = loadRoom(roomId);
    }

    if (!rooms[roomId]) {
        console.warn(`Room ${roomId} not found`);
        return res.status(404).json({ error: `Room ${roomId} not found` });
    }

    console.log(`Returning state for room ${roomId}:`, JSON.stringify(rooms[roomId], null, 2));
    res.status(200).json(rooms[roomId]);
});

io.on("connection", (socket) => {
    const { roomId, userId } = socket.handshake.query as { roomId: string; userId: string };
    console.log(`New connection: roomId=${roomId}, userId=${userId}`);

    if (!roomId || !userId) {
        socket.disconnect();
        return;
    }

    if (!rooms[roomId]) {
        rooms[roomId] = loadRoom(roomId);
    }

    const room = rooms[roomId];
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

    function cleanDisconnectedCursors(roomId: string, room: Room) {
        const connectedSockets = io.sockets.adapter.rooms.get(roomId);

        if (!connectedSockets) {
            room.cursors = [];
            saveRoom(room);
            return;
        }

        const activeUserIds = new Set<string>();
        for (const socketId of connectedSockets) {
            const s = io.sockets.sockets.get(socketId);
            if (s && s.handshake.query.userId) {
                activeUserIds.add(s.handshake.query.userId as string);
            }
        }

        // Filtra os cursores que ainda pertencem a usuários ativos
        room.cursors = room.cursors.filter(cursor =>
            activeUserIds.has(cursor.userId)
        );

        saveRoom(room);
    }

    socket.on("load", () => {
        console.log("Sending room data: ", room);

        cleanDisconnectedCursors(roomId, room);

        const data = {
            blocks: room.blocks,
            cursors: room.cursors
        }

        socket.emit("init", { data });
    })

    socket.on("change", ({ target, cursor }) => {
        console.log(`[CHANGE] Change received from ${userId} in room ${roomId}:`, target, cursor);

        const idx = room.blocks.findIndex(b => b.id === target.id);
        if (idx === -1) {
            room.blocks.push(target);
        } else {
            room.blocks[idx] = target;
        }

        cursor = updateCursors(cursor);
        validateAllCursors();

        saveRoom(room);

        const updatedBlocks = room.blocks
        const updatedCursors = [cursor]

        socket.to(roomId).emit("change", { updatedBlocks, updatedCursors, userId });
    });

    socket.on("enter", ({ cursor, target, blocks }) => {
        console.log(`[ENTER] event received from ${userId} in room ${roomId}:`, cursor, target, blocks);

        const index = room.blocks.findIndex(block => block.id === target.id);
        if (index >= 0) {
            room.blocks[index] = target;
        }

        room.blocks.splice(index + 1, 0, blocks[0]);

        cursor = updateCursors(cursor);
        validateAllCursors();

        saveRoom(room);

        const updatedBlocks = room.blocks
        const updatedCursors = [cursor]

        socket.to(roomId).emit("change", { updatedBlocks, updatedCursors, userId });
    });

    socket.on("backspace", ({ cursor, target, blocks }) => {
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

        saveRoom(room);

        const updatedBlocks = room.blocks
        const updatedCursors = [cursor]

        socket.to(roomId).emit("change", { updatedBlocks, updatedCursors, userId });
    });

    socket.on("delete", ({ cursor, target, blocks }) => {
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

        saveRoom(room);

        const updatedBlocks = room.blocks
        const updatedCursors = [cursor]

        socket.to(roomId).emit("change", { updatedBlocks, updatedCursors, userId });
    });

    socket.on("arrowUp", () => {

    })

    socket.on("disconnect", () => {
        console.log(`Client ${userId} disconnected from room ${roomId}`);
        const cursorIndex = room.cursors.findIndex(c => c.userId == userId);
        room.cursors.splice(cursorIndex, 1);
        saveRoom(room);
        socket.to(roomId).emit("cursor:remove", userId);

        if (io.sockets.adapter.rooms.get(roomId)?.size === 0) {
            delete rooms[roomId];
        }
    });
});


const PORT = 9001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));