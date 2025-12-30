import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SimulationProject, SimulationResults } from '@/types/simulation';

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(value));
};

const formatCurrencyDecimals = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)} %`;
};

const formatNumber = (value: number | null, decimals: number = 1): string => {
  if (value === null) return 'N/A';
  return value.toFixed(decimals);
};

export function generateSimulationReport(
  project: SimulationProject,
  results: SimulationResults
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  // Couleurs harmonisées
  const primaryColor: [number, number, number] = [34, 82, 136]; // Bleu plus professionnel
  const successColor: [number, number, number] = [22, 163, 74];
  const dangerColor: [number, number, number] = [220, 38, 38];
  const darkColor: [number, number, number] = [30, 41, 59];
  const lightBg: [number, number, number] = [248, 250, 252];
  
  let yPos = 20;

  // En-tête
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('SIMULATION DE PROJET', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(project.name || 'Nouveau projet', pageWidth / 2, 32, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 44, { align: 'center' });
  
  yPos = 65;

  // Section 1 : Informations du projet
  doc.setTextColor(...darkColor);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('1. INFORMATIONS DU PROJET', margin, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Paramètre', 'Valeur']],
    body: [
      ['Nom du projet', project.name || 'Non renseigné'],
      ['Localisation', project.location || 'Non renseignée'],
      ['Surface', `${project.surface_m2 || 0} m²`],
      ['Zone', project.zone_type === 'urban' ? 'Urbain' : project.zone_type === 'suburban' ? 'Péri-urbain' : project.zone_type || 'Non renseignée'],
      ['Horaires envisagés', project.opening_hours_description || 'Non renseignés'],
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: primaryColor, 
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      cellPadding: 5
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 5,
      lineColor: [226, 232, 240],
      lineWidth: 0.5
    },
    alternateRowStyles: { fillColor: lightBg },
    columnStyles: { 
      0: { fontStyle: 'bold', cellWidth: 70 }, 
      1: { cellWidth: contentWidth - 70 } 
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // Section 2 : Configuration des machines
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('2. CONFIGURATION DES MACHINES', margin, yPos);
  yPos += 10;

  // Lave-linge
  const washers = project.machines.filter(m => m.type === 'washer');
  const washerRows = washers.map(m => {
    const revenue = results.machine_revenues.find(r => r.id === m.id);
    return [
      `${m.capacity_kg} kg`,
      m.count.toString(),
      formatCurrencyDecimals(m.price),
      m.cycles_day.toString(),
      formatCurrency(revenue?.turnover_month || 0)
    ];
  });
  
  if (washerRows.length > 0) {
    washerRows.push([
      { content: 'Total lavage', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } } as any,
      { content: formatCurrency(results.total_wash_turnover_month), styles: { fontStyle: 'bold', halign: 'right' } } as any
    ]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Lave-linge', 'Qté', 'Prix/cycle', 'Cycles/j', 'CA mensuel']],
    body: washerRows.length > 0 ? washerRows : [['Aucun lave-linge', '', '', '', '']],
    theme: 'grid',
    headStyles: { 
      fillColor: primaryColor, 
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 4,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      halign: 'center',
      lineColor: [226, 232, 240],
      lineWidth: 0.5
    },
    alternateRowStyles: { fillColor: lightBg },
    columnStyles: { 
      0: { halign: 'left' },
      4: { halign: 'right' }
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // Sèche-linge
  const dryers = project.machines.filter(m => m.type === 'dryer');
  const dryerRows = dryers.map(m => {
    const revenue = results.machine_revenues.find(r => r.id === m.id);
    return [
      `${m.capacity_kg} kg`,
      m.count.toString(),
      formatCurrencyDecimals(m.price),
      m.cycles_day.toString(),
      formatCurrency(revenue?.turnover_month || 0)
    ];
  });
  
  if (dryerRows.length > 0) {
    dryerRows.push([
      { content: 'Total séchage', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } } as any,
      { content: formatCurrency(results.total_dry_turnover_month), styles: { fontStyle: 'bold', halign: 'right' } } as any
    ]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Sèche-linge', 'Qté', 'Prix/cycle', 'Cycles/j', 'CA mensuel']],
    body: dryerRows.length > 0 ? dryerRows : [['Aucun sèche-linge', '', '', '', '']],
    theme: 'grid',
    headStyles: { 
      fillColor: primaryColor, 
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 4,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      halign: 'center',
      lineColor: [226, 232, 240],
      lineWidth: 0.5
    },
    alternateRowStyles: { fillColor: lightBg },
    columnStyles: { 
      0: { halign: 'left' },
      4: { halign: 'right' }
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // Section 3 : Charges
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('3. CHARGES MENSUELLES', margin, yPos);
  yPos += 10;

  // Charges fixes
  const fixedCostsRows = project.fixed_costs
    .filter(c => c.amount > 0)
    .map(c => [c.label, formatCurrency(c.amount)]);
  
  fixedCostsRows.push([
    { content: 'TOTAL CHARGES FIXES', styles: { fontStyle: 'bold' } } as any,
    { content: formatCurrency(results.fixed_costs_total), styles: { fontStyle: 'bold', halign: 'right' } } as any
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Charges fixes', 'Montant']],
    body: fixedCostsRows,
    theme: 'grid',
    headStyles: { 
      fillColor: primaryColor, 
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      cellPadding: 5
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 5,
      lineColor: [226, 232, 240],
      lineWidth: 0.5
    },
    alternateRowStyles: { fillColor: lightBg },
    columnStyles: { 
      0: { cellWidth: 120 }, 
      1: { halign: 'right', cellWidth: contentWidth - 120 } 
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // Charges variables
  const variableCostsRows = project.variable_costs
    .filter(c => c.percent > 0)
    .map(c => [c.label, formatPercent(c.percent)]);
  
  variableCostsRows.push([
    { content: 'TOTAL CHARGES VARIABLES', styles: { fontStyle: 'bold' } } as any,
    { content: formatPercent(results.var_total_percent), styles: { fontStyle: 'bold', halign: 'right' } } as any
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Charges variables', 'Taux']],
    body: variableCostsRows,
    theme: 'grid',
    headStyles: { 
      fillColor: primaryColor, 
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      cellPadding: 5
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 5,
      lineColor: [226, 232, 240],
      lineWidth: 0.5
    },
    alternateRowStyles: { fillColor: lightBg },
    columnStyles: { 
      0: { cellWidth: 120 }, 
      1: { halign: 'right', cellWidth: contentWidth - 120 } 
    },
    margin: { left: margin, right: margin },
  });

  // Nouvelle page pour les résultats
  doc.addPage();
  yPos = 20;

  // Section 4 : Résultats
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RÉSULTATS DE LA SIMULATION', pageWidth / 2, 20, { align: 'center' });
  
  yPos = 50;

  // Récapitulatif des recettes
  doc.setTextColor(...darkColor);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('4. CHIFFRE D\'AFFAIRES PRÉVISIONNEL', margin, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Poste', 'Mensuel', 'Annuel']],
    body: [
      ['CA Lavage', formatCurrency(results.total_wash_turnover_month), formatCurrency(results.total_wash_turnover_month * 12)],
      ['CA Séchage', formatCurrency(results.total_dry_turnover_month), formatCurrency(results.total_dry_turnover_month * 12)],
      [
        { content: 'CA TOTAL', styles: { fontStyle: 'bold' } },
        { content: formatCurrency(results.project_turnover_month), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(results.project_turnover_month * 12), styles: { fontStyle: 'bold', halign: 'right' } }
      ],
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: primaryColor, 
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      cellPadding: 6,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 6,
      lineColor: [226, 232, 240],
      lineWidth: 0.5
    },
    alternateRowStyles: { fillColor: lightBg },
    columnStyles: { 
      0: { cellWidth: 80 },
      1: { halign: 'right' }, 
      2: { halign: 'right' } 
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // Seuil de rentabilité
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('5. SEUIL DE RENTABILITÉ', margin, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Seuil de rentabilité (CA mensuel)', results.break_even_revenue_monthly ? formatCurrency(results.break_even_revenue_monthly) : 'N/A'],
      ['Seuil de rentabilité (CA annuel)', results.break_even_revenue_monthly ? formatCurrency(results.break_even_revenue_monthly * 12) : 'N/A'],
      ['Cycles nécessaires / mois', formatNumber(results.break_even_cycles_month, 0)],
      ['Cycles nécessaires / jour', formatNumber(results.break_even_cycles_day, 1)],
      ['Recette moyenne par cycle', formatCurrencyDecimals(results.avg_revenue_per_cycle)],
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: primaryColor, 
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      cellPadding: 6
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 6,
      lineColor: [226, 232, 240],
      lineWidth: 0.5
    },
    alternateRowStyles: { fillColor: lightBg },
    columnStyles: { 
      0: { cellWidth: 120 }, 
      1: { halign: 'right', cellWidth: contentWidth - 120 } 
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // Compte de résultat prévisionnel
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('6. COMPTE DE RÉSULTAT PRÉVISIONNEL', margin, yPos);
  yPos += 10;

  const isProfitable = results.estimated_profit_month >= 0;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Poste', 'Mensuel', 'Annuel']],
    body: [
      ['Chiffre d\'affaires', formatCurrency(results.project_turnover_month), formatCurrency(results.project_turnover_month * 12)],
      [
        `Charges variables (${formatPercent(results.var_total_percent)})`, 
        `- ${formatCurrency(results.variable_costs_total)}`, 
        `- ${formatCurrency(results.variable_costs_total * 12)}`
      ],
      [
        'Marge sur coûts variables', 
        formatCurrency(results.project_turnover_month - results.variable_costs_total), 
        formatCurrency((results.project_turnover_month - results.variable_costs_total) * 12)
      ],
      [
        'Charges fixes', 
        `- ${formatCurrency(results.fixed_costs_total)}`, 
        `- ${formatCurrency(results.fixed_costs_total * 12)}`
      ],
      [
        { content: 'RÉSULTAT NET ESTIMÉ', styles: { fontStyle: 'bold' } },
        { 
          content: formatCurrency(results.estimated_profit_month), 
          styles: { 
            fontStyle: 'bold',
            textColor: isProfitable ? successColor : dangerColor,
            halign: 'right'
          } 
        },
        { 
          content: formatCurrency(results.estimated_profit_month * 12), 
          styles: { 
            fontStyle: 'bold',
            textColor: isProfitable ? successColor : dangerColor,
            halign: 'right'
          } 
        }
      ],
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: primaryColor, 
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      cellPadding: 6,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 6,
      lineColor: [226, 232, 240],
      lineWidth: 0.5
    },
    alternateRowStyles: { fillColor: lightBg },
    columnStyles: { 
      0: { cellWidth: 90 },
      1: { halign: 'right' }, 
      2: { halign: 'right' } 
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // Conclusion
  const conclusionColor = isProfitable ? successColor : dangerColor;
  doc.setFillColor(...conclusionColor);
  doc.roundedRect(margin, yPos, contentWidth, 40, 4, 4, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  
  if (isProfitable) {
    doc.text('✓ Projet au-dessus du seuil de rentabilité', pageWidth / 2, yPos + 14, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Avec ces hypothèses, votre projet génère un bénéfice estimé de ${formatCurrency(results.estimated_profit_month)}/mois,`,
      pageWidth / 2, yPos + 26, { align: 'center' }
    );
    doc.text(
      `soit ${formatCurrency(results.estimated_profit_month * 12)}/an.`,
      pageWidth / 2, yPos + 35, { align: 'center' }
    );
  } else {
    doc.text('⚠ Projet en dessous du seuil de rentabilité', pageWidth / 2, yPos + 14, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Ajustez vos paramètres (loyer, prix, machines, fréquentation...)',
      pageWidth / 2, yPos + 26, { align: 'center' }
    );
    doc.text(
      'pour améliorer la rentabilité de votre projet.',
      pageWidth / 2, yPos + 35, { align: 'center' }
    );
  }

  // Pied de page
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.text(
    'Simulation réalisée avec Lavcom Performances',
    pageWidth / 2, 
    pageHeight - 15, 
    { align: 'center' }
  );
  doc.text(
    'Ces données sont des estimations basées sur vos hypothèses et ne constituent pas un engagement.',
    pageWidth / 2, 
    pageHeight - 10, 
    { align: 'center' }
  );

  // Sauvegarder le PDF
  const fileName = `simulation_${project.name?.replace(/\s+/g, '_') || 'projet'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
