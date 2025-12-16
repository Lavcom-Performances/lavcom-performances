/**
 * NAF codes relevant to laundromat business
 * TAEX-065 - Menu déroulant pour le code NAF
 */

export interface NafCode {
  code: string;
  label: string;
}

export const nafCodes: NafCode[] = [
  { code: "9601B", label: "Blanchisserie-teinturerie de détail" },
  { code: "9601A", label: "Blanchisserie-teinturerie de gros" },
  { code: "7729Z", label: "Location et location-bail d'autres biens personnels et domestiques" },
  { code: "4778C", label: "Autres commerces de détail spécialisés divers" },
  { code: "4719B", label: "Autres commerces de détail en magasin non spécialisé" },
  { code: "6820B", label: "Location de terrains et d'autres biens immobiliers" },
  { code: "6820A", label: "Location de logements" },
  { code: "7022Z", label: "Conseil pour les affaires et autres conseils de gestion" },
  { code: "8299Z", label: "Autres activités de soutien aux entreprises n.c.a." },
  { code: "3320D", label: "Installation de machines et équipements industriels" },
];

export const defaultNafCode = nafCodes[0];

export function getNafLabel(code: string): string | undefined {
  const naf = nafCodes.find(n => n.code === code);
  return naf ? naf.label : undefined;
}

export function formatNafDisplay(code: string): string {
  const naf = nafCodes.find(n => n.code === code);
  return naf ? `${naf.code} – ${naf.label}` : code;
}
