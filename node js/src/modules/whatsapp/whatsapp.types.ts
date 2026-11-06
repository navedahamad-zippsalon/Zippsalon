import { WhatsAppMessageType, WhatsAppTemplateCategory } from "@prisma/client";

export type ProviderSendResult = { providerMessageId: string };
export interface WhatsAppProvider {
  sendTextMessage(to: string, body: string): Promise<ProviderSendResult>;
  sendTemplateMessage(to: string, name: string, language: string, variables: unknown): Promise<ProviderSendResult>;
  sendMediaMessage(to: string, type: WhatsAppMessageType, media: unknown, caption?: string): Promise<ProviderSendResult>;
  getTemplates(): Promise<unknown[]>;
  createTemplate(payload: unknown): Promise<unknown>;
  getPhoneNumbers(): Promise<unknown[]>;
  getBusinessProfile(): Promise<unknown>;
  markMessageAsRead(messageId: string): Promise<void>;
  verifyCredentials(): Promise<boolean>;
}

export const isAdmin = (roles: string[]) => roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
export const categoryFor = (messageType: WhatsAppMessageType, category?: WhatsAppTemplateCategory) => category ?? (messageType === "TEMPLATE" ? "UTILITY" : "SERVICE");
