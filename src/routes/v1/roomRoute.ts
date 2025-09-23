import express from "express";
import createRoomAction from "../../actions/createRoomAction.ts";
import loadRoomAction from "../../actions/loadRoom.ts";

const router = express.Router();

router.post("/", (req: express.Request, res: express.Response) => {
    const { roomId } = req.body;

    if (!roomId || typeof roomId !== "string") {
        console.warn(`[WARN] Invalid roomId in POST /rooms: ${roomId}`);
        return res.status(400).json({ error: "roomId is required and must be a string" });
    }

    const room = createRoomAction(roomId);
    if (!room) return res.status(500).json({ error: "An error ocorred while creating a new room" });

    res.status(201).json({ message: `Room ${roomId} created successfully` });
});

router.get("/:roomId", (req: express.Request, res: express.Response) => {
    const { roomId } = req.params;

    if (!roomId || typeof roomId !== "string") {
        console.warn(`[WARN] Invalid roomId in GET /rooms: ${roomId}`);
        return res.status(400).json({ error: "roomId is required and must be a string" });
    }

    const data = loadRoomAction(roomId);
    if (!data) return res.status(500).json({ error: "An error ocorred while retriving room data" });

    res.status(200).json({ data: data });
});

export default router;