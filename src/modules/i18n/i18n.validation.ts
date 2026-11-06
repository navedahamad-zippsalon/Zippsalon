import { z } from "zod";

export const languagePreferenceSchema = z.object({
    language: z.enum(["en", "hi", "hi-en"]),
});
