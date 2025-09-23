import fs from "fs";
import path from "path";
import { DATA_DIR } from "../../globals.ts";
import { Room } from "../types.ts";

export class RoomRepositoryFs {
    private filePath(roomId: string) {
        return path.join(DATA_DIR, `${roomId}.json`);
    }

    async create(roomId: string): Promise<Room> {
        const filePath = this.filePath(roomId);

        try {
            await fs.promises.access(filePath);
            throw new Error(`Room ${roomId} already exists`);
        } catch {
            const room: Room = { id: roomId, blocks: [], cursors: [] };
            await fs.promises.writeFile(filePath, JSON.stringify(room, null, 2));
            return room;
        }
    }

    async load(roomId: string): Promise<Room> {
        const filePath = this.filePath(roomId);

        try {
            const raw = await fs.promises.readFile(filePath, "utf-8");
            return JSON.parse(raw) as Room;
        } catch {
            throw Error(`Room ${roomId} not found`);
        }
    }

    async save(room: Room): Promise<boolean> {
        const filePath = this.filePath(room.id);

        try {
            await fs.promises.access(filePath);
        } catch {
            console.error(`[ERROR] Room ${room.id} does not exist at ${filePath}`);
            return false;
        }

        try {
            await fs.promises.writeFile(filePath, JSON.stringify(room, null, 2));
            return true;
        } catch (error) {
            console.error(`[ERROR] Error saving room ${room.id} to ${filePath}:`, error);
            return false;
        }
    }
}
