CREATE TYPE "LanguageCode" AS ENUM ('en', 'hi', 'hi_en');

ALTER TABLE "User"
ADD COLUMN "preferredLanguage" "LanguageCode" NOT NULL DEFAULT 'en';
