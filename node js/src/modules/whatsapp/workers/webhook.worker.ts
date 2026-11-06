import { whatsappService } from "../whatsapp.service";
export const processWebhook = (payload: unknown) => whatsappService.webhook(payload);
