import express from "express";
import http from "http";
import { Server } from "socket.io";
import routes from "./routes/v1/index.js";
import dotenv from 'dotenv'
import { RoomRepositoryFs } from "./repositories/RoomRepositoryFs.js";
import { RoomManager } from "./services/RoomManager.js";
import { ActionPerformed, Register, Room } from "./types.js";
import { updateBlocks } from "./actions/updateBlocks.js";
import { createBlocks } from "./actions/createBlocks.js";
import { deleteBlocks } from "./actions/deleteBlocks.js";
import { updateCursors } from "./actions/updateCursors.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use("/api/v1/", routes);

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

    if (!room) {
        socket.disconnect();
        return;    
    }

    socket.join(roomId);

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

    socket.on("change", async ({ cursor, target_id, register }: ActionPerformed) => {

        const { updated, created } = register;

        const index = room.blocks.findIndex(block => block.id === target_id);

        updateBlocks(room.blocks, updated ?? []);

        createBlocks(room.blocks, created ?? [], index);

        cursor = updateCursors(room, cursor, userId);

        await roomManager.saveRoom(room);

        const dispatch: Register = {
            updated,
            created,
            deleted: [],
        }

        socket.to(roomId).emit("change", { updatedCursors: [cursor], dispatch, create_start: index });
    });

    socket.on("enter", async ({ cursor, target_id, register }: ActionPerformed) => {

        const { updated, created } = register;

        const index = room.blocks.findIndex(block => block.id === target_id);

        updateBlocks(room.blocks, updated ?? []);

        createBlocks(room.blocks, created ?? [], index);

        cursor = updateCursors(room, cursor, userId);

        await roomManager.saveRoom(room);

        const dispatch: Register = {
            updated,
            created,
            deleted: [],
        }

        socket.to(roomId).emit("change", { updatedCursors: [cursor], dispatch, create_start: index });
    });

    socket.on("backspace", async ({ cursor, register }: ActionPerformed) => {

        const { updated, deleted } = register;

        updateBlocks(room.blocks, updated ?? []);

        deleteBlocks(room.blocks, deleted ?? []);

        cursor = updateCursors(room, cursor, userId);

        await roomManager.saveRoom(room);

        const dispatch: Register = {
            updated,
            created: [],
            deleted,
        }

        socket.to(roomId).emit("change", { updatedCursors: [cursor], dispatch });
    });

    socket.on("delete", async ({ cursor, register }: ActionPerformed) => {

        const { updated, deleted } = register;

        updateBlocks(room.blocks, updated ?? []);

        deleteBlocks(room.blocks, deleted ?? []);

        cursor = updateCursors(room, cursor, userId);

        await roomManager.saveRoom(room);

        const dispatch: Register = {
            updated,
            created: [],
            deleted,
        }

        socket.to(roomId).emit("change", { updatedCursors: [cursor], dispatch });
    });

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

const PORT = process.env.APP_PORT;
server.listen(PORT, () => console.log(`Server now running on port ${PORT}`));