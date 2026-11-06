import axios, { AxiosInstance } from "axios";
import { WhatsAppMessageType } from "@prisma/client";
import { WhatsAppProvider } from "../whatsapp.types";

export class MetaWhatsAppProvider implements WhatsAppProvider {
  private client: AxiosInstance;
  constructor(private readonly token: string, private readonly phoneNumberId: string, private readonly businessAccountId: string, apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0") {
    this.client = axios.create({ baseURL: `${process.env.WHATSAPP_API_BASE_URL || "https://graph.facebook.com"}/${apiVersion}`, headers: { Authorization: `Bearer ${token}` } });
  }
  private async send(payload: Record<string, unknown>) { const response = await this.client.post(`/${this.phoneNumberId}/messages`, { messaging_product: "whatsapp", ...payload }); return { providerMessageId: response.data?.messages?.[0]?.id }; }
  async sendTextMessage(to: string, body: string) { return this.send({ to, type: "text", text: { body } }); }
  async sendTemplateMessage(to: string, name: string, language: string, variables: unknown) {
    let components: unknown[] = [];
    if (Array.isArray(variables)) {
      components = variables.length ? [{ type: "body", parameters: variables }] : [];
    } else if (variables && typeof variables === "object") {
      const payload = variables as { components?: unknown[]; body?: unknown[]; buttons?: unknown[] };
      if (Array.isArray(payload.components)) components = payload.components;
      else {
        if (Array.isArray(payload.body) && payload.body.length) components.push({ type: "body", parameters: payload.body });
        if (Array.isArray(payload.buttons)) components.push(...payload.buttons);
      }
    }
    return this.send({ to, type: "template", template: { name, language: { code: language }, components } });
  }
  async sendMediaMessage(to: string, type: WhatsAppMessageType, media: any, caption?: string) { return this.send({ to, type: type.toLowerCase(), [type.toLowerCase()]: { ...media, ...(caption ? { caption } : {}) } }); }
  async getTemplates() {
    const templates: unknown[] = [];
    let url = `/${this.businessAccountId}/message_templates`;
    let firstPage = true;
    for (let page = 0; url && page < 100; page += 1) {
      const { data } = await this.client.get(url, firstPage ? { params: { limit: 100 } } : undefined);
      templates.push(...(Array.isArray(data.data) ? data.data : []));
      firstPage = false;
      if (!data.paging?.next) break;
      const next = new URL(data.paging.next);
      if (next.hostname !== "graph.facebook.com" || next.protocol !== "https:") throw new Error("WHATSAPP_TEMPLATE_PAGINATION_INVALID");
      next.searchParams.delete("access_token");
      url = next.toString();
    }
    return templates;
  }
  async createTemplate(payload: unknown) { const { data } = await this.client.post(`/${this.businessAccountId}/message_templates`, payload); return data; }
  async getPhoneNumbers() { const { data } = await this.client.get(`/${this.businessAccountId}/phone_numbers`); return data.data ?? []; }
  async getBusinessProfile() { const { data } = await this.client.get(`/${this.phoneNumberId}/whatsapp_business_profile`); return data.data?.[0] ?? data; }
  async markMessageAsRead(messageId: string) { await this.client.post(`/${this.phoneNumberId}/messages`, { messaging_product: "whatsapp", status: "read", message_id: messageId }); }
  async verifyCredentials() { try { await this.client.get(`/${this.phoneNumberId || this.businessAccountId}`); return true; } catch { return false; } }
}
