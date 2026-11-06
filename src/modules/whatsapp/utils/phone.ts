export const normalizePhone = (phone: string, countryCode = "+91") => {
  const raw = phone.trim().replace(/[\s().-]/g, "");
  const value = raw.startsWith("+") ? raw : `${countryCode.startsWith("+") ? countryCode : `+${countryCode}`}${raw.replace(/^0+/, "")}`;
  if (!/^\+[1-9]\d{7,14}$/.test(value)) throw Object.assign(new Error("WHATSAPP_INVALID_PHONE"), { status: 400, code: "WHATSAPP_INVALID_PHONE" });
  return value;
};
