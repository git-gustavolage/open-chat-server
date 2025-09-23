import { Router } from 'express';
import roomRoute from "./roomRoute.ts";

const router = Router();

router.use('/rooms', roomRoute);

export default router;