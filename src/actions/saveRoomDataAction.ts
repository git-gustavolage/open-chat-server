import path from "path";
import { Room } from "../types.ts";
import { DATA_DIR } from "../../globals.ts";
import loadRoom from "./loadRoom.ts";
import fs from "fs";

const saveRoomDataAction = (room: Room) => {
    const filePath = path.join(DATA_DIR, `${room.id}.json`);

    if (!fs.existsSync(filePath)) {
        console.error("[ERROR] file does not exists!");
        const sucess = loadRoom(room.id);
        return !!sucess;
    }

    try {
        fs.writeFileSync(filePath, JSON.stringify(room, null, 2));
    } catch (error) {
        console.error(`[ERROR] Error saving room ${room.id} to ${filePath}:`, error);
        return false;
    }

    console.info(`[INFO] Room ${room.id} updated successfully!`);
    return true;
}

export default saveRoomDataAction