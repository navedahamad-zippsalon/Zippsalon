import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { env } from "./config/env";
import logger from "./infrastructure/logger/logger";
import { errorHandler } from "./common/middleware/error.middleware";
import v1Routes from "./routes/v1";
import { setupSwagger } from "./config/swagger";
import { requestContext } from "./common/middleware/request-context.middleware";
import { webhook } from "./modules/subscription/subscription.controller";
import { languageMiddleware } from "./modules/i18n/i18n.middleware";

const app = express();
const trustedProxyIps = env.TRUSTED_PROXY_IPS?.split(",").map((ip) => ip.trim()).filter(Boolean);
if (trustedProxyIps?.length && !trustedProxyIps.includes("*")) {
    app.set("trust proxy", trustedProxyIps);
}

app.use(requestContext);
app.use(cors(env.CORS_ORIGIN ? { origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()) } : undefined));
const captureRawBody = (req: express.Request, _res: express.Response, buffer: Buffer) => {
    (req as any).rawBody = Buffer.from(buffer);
};
// Three 10 MiB images encoded as base64 can require about 40 MiB of JSON.
// Keep this larger limit scoped to service create/update requests only.
const serviceJsonParser = express.json({ limit: "45mb", verify: captureRawBody });
app.use("/api/v1/services", (req, res, next) => {
    const servicePath = req.originalUrl.split("?")[0];
    const createsService = req.method === "POST" && /^\/api\/v1\/services\/salon\/[^/]+$/.test(servicePath);
    const updatesService = req.method === "PATCH" && /^\/api\/v1\/services\/[^/]+$/.test(servicePath);
    if (createsService || updatesService) {
        serviceJsonParser(req, res, next);
        return;
    }
    next();
});
app.use(express.json({
    limit: env.JSON_BODY_LIMIT || "100kb",
    verify: captureRawBody,
}));

app.use("/public", express.static(path.join(process.cwd(), "public")));

app.use(morgan("dev"));
app.use(
    morgan("combined", {
        stream: {
            write: (message) => logger.info(message.trim()),
        },
    })
);

setupSwagger(app);

app.post("/webhooks/razorpay", webhook);

app.use("/api/v1", languageMiddleware);
app.use("/api/v1", v1Routes);

app.use(errorHandler);

app.get("/health", (req, res) => {
    res.json({ status: "OK" });
});

export default app;
