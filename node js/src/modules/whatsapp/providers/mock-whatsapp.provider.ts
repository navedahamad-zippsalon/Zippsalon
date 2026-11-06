import { WhatsAppMessageType } from "@prisma/client";
import { WhatsAppProvider } from "../whatsapp.types";

export class MockWhatsAppProvider implements WhatsAppProvider {
  async sendTextMessage() { return { providerMessageId: `mock-${Date.now()}` }; }
  async sendTemplateMessage() { return { providerMessageId: `mock-${Date.now()}` }; }
  async sendMediaMessage(_to: string, _type: WhatsAppMessageType, _media: unknown, _caption?: string) { return { providerMessageId: `mock-${Date.now()}` }; }
  async getTemplates() { return []; }
  async createTemplate(payload: unknown) { return payload; }
  async getPhoneNumbers() { return []; }
  async getBusinessProfile() { return {}; }
  async markMessageAsRead() {}
  async verifyCredentials() { return true; }
}
