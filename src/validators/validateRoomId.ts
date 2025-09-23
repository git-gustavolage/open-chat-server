import express from "express";

function validateRoomId(req: express.Request, res: express.Response, next: express.NextFunction) {
    const { roomId } = req.body || req.params;

    if (!roomId || typeof roomId !== "string") {
        return res.status(400).json({ error: "roomId is required and must be a string" });
    }
    
    next();
}

export default validateRoomId;