export const calculateWhatsAppCharge = (billableMessages: number, perMessageRate: number, campaignCharge: number) => {
  if (billableMessages <= 0) return 0;
  return Number((billableMessages * perMessageRate + campaignCharge).toFixed(2));
};
