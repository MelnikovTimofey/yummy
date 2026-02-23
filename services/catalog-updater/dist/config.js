"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const node_path_1 = __importDefault(require("node:path"));
const toNumber = (value, fallback) => {
    if (!value) {
        return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
}
exports.config = {
    host: process.env.HOST ?? '0.0.0.0',
    port: toNumber(process.env.PORT, 3011),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    databaseUrl,
    updaterApiKey: process.env.UPDATER_API_KEY,
    seedDir: process.env.CATALOG_SEED_DIR
        ? node_path_1.default.resolve(process.env.CATALOG_SEED_DIR)
        : node_path_1.default.resolve(process.cwd(), '../../backend/seed'),
    mustHave: {
        baseUrl: process.env.MUSTHAVE_BASE_URL ?? 'https://musthave.ru/showmixes/view/',
        fromId: toNumber(process.env.MUSTHAVE_ID_FROM, 1),
        toId: toNumber(process.env.MUSTHAVE_ID_TO, 2000),
        delayMs: toNumber(process.env.MUSTHAVE_DELAY_MS, 250),
    },
};
