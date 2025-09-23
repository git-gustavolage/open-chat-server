import { Router } from 'express';
import roomRoute from "./roomRoute.js";

const router = Router();

router.use('/rooms', roomRoute);

export default router;