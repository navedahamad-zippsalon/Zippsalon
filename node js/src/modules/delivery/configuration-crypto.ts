import crypto from "crypto";

const algorithm = "aes-256-gcm";

function key() {
  const value = process.env.SMTP_CONFIG_ENCRYPTION_KEY || process.env.PAYMENT_ENCRYPTION_KEY || process.env.WHATSAPP_ENCRYPTION_KEY;
  if (!value || value.length < 32) {
    throw { status: 503, code: "CONFIGURATION_ENCRYPTION_UNAVAILABLE", message: "Delivery configuration encryption is unavailable." };
  }
  return crypto.createHash("sha256").update(value).digest();
}

export function encryptDeliverySecret(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptDeliverySecret(value: string) {
  try {
    const [iv, tag, data] = value.split(".");
    if (!iv || !tag || !data) throw new Error("Malformed ciphertext");
    const decipher = crypto.createDecipheriv(algorithm, key(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch (error) {
    if ((error as any)?.code === "CONFIGURATION_ENCRYPTION_UNAVAILABLE") throw error;
    throw { status: 503, code: "CONFIGURATION_ENCRYPTION_UNAVAILABLE", message: "Delivery configuration encryption is unavailable." };
  }
}

export const maskSecret = (value?: string | null) => value ? "********" : null;
