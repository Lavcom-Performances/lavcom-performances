export function getDepartmentFromPostcode(postcode: string): string {
  const pc = (postcode || "").trim();
  // DOM/TOM: 97x / 98x -> 3 premiers chiffres
  if (pc.startsWith("97") || pc.startsWith("98")) return pc.slice(0, 3);
  // Métropole -> 2 premiers chiffres
  return pc.slice(0, 2);
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
