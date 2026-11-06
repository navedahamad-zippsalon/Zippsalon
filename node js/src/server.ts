import dotenv from "dotenv";
dotenv.config();

import { env } from "./config/env";
import app from "./app";
import logger from "./infrastructure/logger/logger";
import { prisma } from "./infrastructure/database/prisma";
import redis from "./infrastructure/redis/redis";
import { expireStaleSessions } from "./modules/tracking/tracking.service";

const PORT = env.PORT || 4000;
const trackingCleanup = setInterval(() => {
    void expireStaleSessions().catch((error) => logger.error("tracking_session_cleanup_failed", { message: error instanceof Error ? error.message : String(error) }));
}, 5 * 60 * 1000);
trackingCleanup.unref();

const server = app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
    logger.info(`Docs available at http://localhost:${PORT}/api-docs`);
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Docs available at http://localhost:${PORT}/api-docs`);
});

const shutdown = async (signal: string) => {
    logger.info("server_shutdown", { signal });
    server.close(async () => {
        await prisma.$disconnect();
        if (redis.status !== "end") redis.disconnect();
        process.exit(0);
    });
};

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));