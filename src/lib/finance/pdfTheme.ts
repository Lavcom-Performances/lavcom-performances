/**
 * PDF Theme Configuration
 * Bank-grade styling constants for financial PDF generation
 */

// =====================================================
// COLORS (RGB arrays for jsPDF compatibility)
// =====================================================

/** Primary brand blue - used for headers and accents */
export const BRAND_BLUE: [number, number, number] = [47, 117, 181]; // #2F75B5

/** Light grey - used for alternating rows and totals */
export const LIGHT_ROW: [number, number, number] = [242, 242, 242]; // #F2F2F2

/** Grid line color */
export const GRID_COLOR: [number, number, number] = [208, 208, 208]; // #D0D0D0

/** White */
export const WHITE: [number, number, number] = [255, 255, 255];

/** Black */
export const BLACK: [number, number, number] = [0, 0, 0];

/** Grey text for explanatory paragraphs */
export const GREY_TEXT: [number, number, number] = [100, 100, 100];

// =====================================================
// TYPOGRAPHY
// =====================================================

export const FONT_SIZES = {
  /** Page title */
  title: 24,
  /** Section headers */
  header: 14,
  /** Sub-section headers */
  subHeader: 12,
  /** Table header cells */
  tableHeader: 11,
  /** Table body cells */
  tableBody: 9,
  /** Small table cells (treasury grid) */
  tableSmall: 8,
  /** Explanatory paragraphs */
  explanation: 9,
  /** Footer text */
  footer: 8,
};

// =====================================================
// SPACING
// =====================================================

export const SPACING = {
  /** Page margins */
  pageMargin: 14,
  /** Cell padding horizontal */
  cellPaddingH: 6,
  /** Cell padding vertical */
  cellPaddingV: 4,
  /** Section header height */
  sectionHeaderHeight: 8,
  /** Gap after section header */
  afterSectionHeader: 12,
  /** Gap between tables */
  betweenTables: 15,
  /** Gap for explanatory text after table */
  afterTableExplanation: 8,
  /** Line height multiplier */
  lineHeight: 1.2,
};

// =====================================================
// COLUMN WIDTH PRESETS (as percentages of available width)
// =====================================================

/** P&L Table: Poste + 3 Years + % */
export const PNL_COLUMNS = {
  poste: 0.42,
  year1: 0.16,
  year2: 0.16,
  year3: 0.16,
  percent: 0.10,
};

/** Balance Sheet: Poste + 3 Years */
export const BALANCE_COLUMNS = {
  poste: 0.40,
  year1: 0.20,
  year2: 0.20,
  year3: 0.20,
};

/** Funding/BFR: Poste + Montant + % */
export const FUNDING_COLUMNS = {
  poste: 0.50,
  montant: 0.30,
  percent: 0.20,
};

/** Treasury: Poste + 6 months */
export const TREASURY_COLUMNS = {
  poste: 0.28,
  month: 0.12, // Each of 6 months
};

/** Line Items: Category + Label + Qty + Price + Util + CA */
export const LINE_ITEMS_COLUMNS = {
  category: 0.14,
  label: 0.26,
  qty: 0.08,
  price: 0.14,
  utilization: 0.12,
  revenue: 0.16,
};

// =====================================================
// EXPLANATORY PARAGRAPHS (French)
// =====================================================

export const EXPLANATIONS = {
  executiveSummary: 
    "Cette synthèse présente les indicateurs clés du scénario sélectionné. " +
    "Les montants TTC servent à la trésorerie, tandis que le compte de résultat est exprimé en HT.",
  
  pnl: 
    "Le compte de résultat est présenté en HT. Il mesure la performance économique " +
    "(CA, charges, EBITDA) sur la période, indépendamment du calendrier des encaissements/décaissements.",
  
  balance: 
    "Le bilan présente la situation patrimoniale en fin d'exercice (actif et passif). " +
    "Les disponibilités correspondent à la trésorerie cumulée après prise en compte des flux.",
  
  treasury: 
    "Le plan de trésorerie est exprimé en TTC et intègre la TVA mensuelle à payer. " +
    "Il permet de vérifier la capacité du projet à financer son activité mois par mois.",
  
  funding: 
    "Le plan de financement compare les besoins initiaux (investissements, BFR, frais) " +
    "aux ressources (apport, emprunt, aides). Les pourcentages sont affichés uniquement si un total est renseigné.",
  
  bfr: 
    "Le BFR (besoin en fonds de roulement) représente le décalage entre les besoins (stocks, créances) " +
    "et les ressources (dettes). Un BFR négatif signifie un financement favorable par les dettes.",
};

// =====================================================
// MONTH NAMES
// =====================================================

export const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export const MONTH_ABBREV = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jui",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"
];
