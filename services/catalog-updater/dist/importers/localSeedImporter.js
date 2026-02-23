"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadLocalSeedCatalog = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const readJson = async (filePath) => {
    const data = await promises_1.default.readFile(filePath, 'utf-8');
    return JSON.parse(data);
};
const loadLocalSeedCatalog = async (seedDir) => {
    const tobaccosPath = node_path_1.default.join(seedDir, 'tobaccos.json');
    const mixesPath = node_path_1.default.join(seedDir, 'mixes.json');
    const [tobaccos, mixes] = await Promise.all([
        readJson(tobaccosPath),
        readJson(mixesPath),
    ]);
    return {
        source: 'local-seed',
        tobaccos,
        mixes,
        fetchedAt: new Date().toISOString(),
    };
};
exports.loadLocalSeedCatalog = loadLocalSeedCatalog;
