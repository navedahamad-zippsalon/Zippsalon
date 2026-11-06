import crypto from "crypto";

const algorithm = "aes-256-gcm";
const key = () => {
  const value =
    process.env.PAYMENT_ENCRYPTION_KEY ||
    process.env.WHATSAPP_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "zippsalon-default-secure-encryption-key-2026";
  return crypto.createHash("sha256").update(value).digest();
};
export const encrypt = (plain: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
};
export const decrypt = (value: string) => {
  const [iv, tag, data] = value.split(".");
  const decipher = crypto.createDecipheriv(algorithm, key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
};
