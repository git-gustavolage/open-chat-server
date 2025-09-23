import path from "path";
import { DATA_DIR } from "../../globals.ts";
import fs from "fs";
import { Room } from "../types.ts";
import createRoomAction from "./createRoomAction.ts";

const loadRoomAction = (roomId: string) => {
    const filePath = path.join(DATA_DIR, `${roomId}.json`);

    if (!fs.existsSync(filePath)) {
        console.error("[ERROR] file does not exists!");
        return createRoomAction(roomId);
    }

    let room = null;

    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        room = JSON.parse(raw) as Room;
    } catch (error) {
        console.error(`[ERROR] Error loading room ${roomId} from ${filePath}:`, error);
    }

    console.info(`[INFO] Data from room ${roomId} loaded sucessfully!`);
    return room;
}

export default loadRoomAction;