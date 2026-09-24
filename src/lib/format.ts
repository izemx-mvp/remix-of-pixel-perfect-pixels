export const mad = (n: number) =>
  new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", maximumFractionDigits: 0 }).format(n);

export const num = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export const daysAgo = (n: number) => {
  const d = new Date("2026-09-24T10:00:00Z");
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

export const daysAhead = (n: number) => daysAgo(-n);
