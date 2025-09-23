import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
    console.info(`[CONFIG] Creating data directory at: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

export {
    DATA_DIR,
};