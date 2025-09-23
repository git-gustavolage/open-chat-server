import { RoomRepositoryFs } from "../repositories/RoomRepositoryFs.js";
import { Room } from "../types.js";

export class RoomManager {
    private repo: RoomRepositoryFs;
    private rooms: Map<string, Room>;

    constructor(repo: RoomRepositoryFs) {
        this.repo = repo;
        this.rooms = new Map();
    }

    async getRoom(roomId: string): Promise<Room> {
        if (!this.rooms.has(roomId)) {
            const room = await this.repo.load(roomId);
            this.rooms.set(roomId, room);
        }
        return this.rooms.get(roomId)!;
    }

    async saveRoom(room: Room): Promise<void> {
        this.rooms.set(room.id, room);
        await this.repo.save(room);
    }

    async createRoom(roomId: string): Promise<Room> {
        const room = await this.repo.create(roomId);
        this.rooms.set(roomId, room);
        return room;
    }

    forget(roomId: string): void {
        this.rooms.delete(roomId);
    }
}
