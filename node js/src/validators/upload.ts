import { z } from "zod";

export const uploadQuerySchema = z.object({
    folder: z.string().regex(/^[a-zA-Z0-9_-]+$/, "Folder name can only contain alphanumeric characters, underscores, and hyphens").optional(),
}).passthrough();

