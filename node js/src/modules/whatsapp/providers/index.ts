import { prisma } from "../../../infrastructure/database/prisma";
import { decrypt } from "../utils/encryption";
import { WhatsAppProvider } from "../whatsapp.types";
import { MetaWhatsAppProvider } from "./meta-whatsapp.provider";
import { MockWhatsAppProvider } from "./mock-whatsapp.provider";

export const providerFor = async (connectionId?: string): Promise<WhatsAppProvider> => {
  if ((process.env.WHATSAPP_PROVIDER || "meta") === "mock") return new MockWhatsAppProvider();
  if (!connectionId) throw Object.assign(new Error("WHATSAPP_CONNECTION_NOT_FOUND"), { status: 404, code: "WHATSAPP_CONNECTION_NOT_FOUND" });
  const connection = await prisma.whatsAppConnection.findUnique({ where: { id: connectionId } });
  if (!connection) throw Object.assign(new Error("WHATSAPP_CONNECTION_NOT_FOUND"), { status: 404, code: "WHATSAPP_CONNECTION_NOT_FOUND" });
  return new MetaWhatsAppProvider(decrypt(connection.encryptedAccessToken), connection.phoneNumberId, connection.businessAccountId, connection.apiVersion);
};
