const SALON_KEYWORDS = [
    "haircut",
    "hairstyle",
    "salon",
    "beard",
    "facial",
    "spa",
    "hair",
    "stylist",
    "barber",
    "makeover",
    "beauty",
    "grooming",
    "hair color",
    "keratin",
];

export function enrichSalonPrompt(prompt: string) {
    const lower = prompt.toLowerCase();

    const isValid = SALON_KEYWORDS.some((word) =>
        lower.includes(word)
    );

    if (!isValid) {
        return prompt + ", set inside a premium professional beauty salon, luxury spa, hair styling";
    }

    return prompt;
}