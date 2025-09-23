import express from "express";
import { RoomRepositoryFs } from "../../repositories/RoomRepositoryFs.ts";
import validateRoomId from "../../validators/validateRoomId.ts";

const router = express.Router();
const repo = new RoomRepositoryFs();

router.post("/", validateRoomId, async (req: express.Request, res: express.Response) => {
    try {
        const { roomId } = req.body;

        const room = await repo.create(roomId);

        return res.status(201).json({ message: `Room ${roomId} created successfully`, data: room });
    } catch (err: any) {
        return res.status(400).json({ error: err.message });
    }
});

router.get("/:roomId", async (req: express.Request, res: express.Response) => {
    try {
        const { roomId } = req.params;

        const data = await repo.load(roomId);

        return res.status(200).json({ data: data });
    } catch (err: any) {
        return res.status(400).json({ error: err.message });
    }
});

export default router;