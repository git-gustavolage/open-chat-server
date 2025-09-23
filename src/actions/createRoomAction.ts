import path from "path";
import { DATA_DIR } from "../../globals.ts"
import fs from "fs";
import { Room } from "../types.ts";

const createRoomAction = (roomId: string): Room | null => {
    const filePath = path.join(DATA_DIR, `${roomId}.json`);

    const room: Room = { id: roomId, blocks: [], cursors: [] };

    if (fs.existsSync(filePath)) {
        console.error("[ERROR] file alredy exists!");
        return null;
    }

    try {
        fs.writeFileSync(filePath, JSON.stringify(room, null, 2));
    } catch (error) {
        console.error(`[ERROR] Error saving room ${roomId} to ${filePath}:`, error);
        return null;
    }

    console.info(`[INFO] Room ${room.id} created successfully!`);
    return room;
}

export default createRoomAction;