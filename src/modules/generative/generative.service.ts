import axios from "axios";
import { env } from "../../config/env";
import logger from "../../infrastructure/logger/logger";

const providerError = (message: string, code: string, status = 503) => ({ status, code, message });

export async function generateImage(prompt: string) {
    if (!env.STABILITY_API_KEY?.trim()) {
        throw providerError("Image generation is not configured. Set STABILITY_API_KEY on the backend.", "AI_PROVIDER_NOT_CONFIGURED");
    }

    try {
        const response = await axios.post(
            env.STABILITY_API_URL,
            {
                text_prompts: [
                    {
                        text: "professional salon photography, " + prompt,
                        weight: 1,
                    },
                ],
                cfg_scale: 7,
                height: 1024,
                width: 1024,
                samples: 1,
                steps: 30,
            },
            {
                headers: {
                    Authorization: `Bearer ${env.STABILITY_API_KEY}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                timeout: 120000,
            }
        );

        const base64 = response.data?.artifacts?.[0]?.base64;
        if (typeof base64 !== "string" || !base64.trim()) {
            throw providerError("The image provider returned an empty image.", "AI_PROVIDER_EMPTY_RESPONSE");
        }

        return `data:image/png;base64,${base64}`;
    } catch (err: any) {
        if (err?.code?.startsWith("AI_PROVIDER_")) throw err;

        const providerStatus = err?.response?.status;
        logger.error("image_generation_provider_error", {
            providerStatus,
            axiosCode: err?.code,
            responseMessage: err?.response?.data?.message,
        });

        if (providerStatus === 401 || providerStatus === 403) {
            throw providerError("The image provider rejected the configured API key.", "AI_PROVIDER_AUTH_FAILED");
        }
        if (providerStatus === 429) {
            throw providerError("The image provider rate limit was reached. Please try again later.", "AI_PROVIDER_RATE_LIMITED", 429);
        }
        if (err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT") {
            throw providerError("The image provider timed out. Please try again.", "AI_PROVIDER_TIMEOUT", 504);
        }
        throw providerError("The image provider is temporarily unavailable. Please try again later.", "AI_PROVIDER_UNAVAILABLE");
    }
}