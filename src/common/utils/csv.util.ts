const csvValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (headers: string[], rows: unknown[][]) =>
  `\uFEFF${[headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\r\n")}\r\n`;

export const sendCsv = (res: { setHeader: (name: string, value: string) => void; status: (code: number) => { send: (body: string) => void } }, filename: string, headers: string[], rows: unknown[][]) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(toCsv(headers, rows));
};
