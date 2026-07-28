export const PURCHASES_STRINGS = {
  greeting: "Bonjour {firstName} 👋",
  subtitle: "Voici le récapitulatif de vos achats",
  addOption: "Ajouter une option",
  addToCart: "Ajouter au panier",
  oneOffPayment: "Paiement unique, sans renouvellement automatique.",
  addons: [
    {
      id: "extension-30",
      title: "Extension 30 jours",
      price: "59 €",
      description: "Prolonge votre accès au simulateur de 30 jours.",
    },
    {
      id: "extra-project",
      title: "+1 Projet supplémentaire",
      price: "39 €",
      description: "Ajoute un emplacement de projet.",
    },
  ],
  invoicesTitle: "Historique des factures",
  columns: {
    date: "Date",
    description: "Description",
    amount: "Montant",
    pdf: "PDF",
  },
  seeAll: "Voir toutes les factures",
  emptyTitle: "Aucune facture pour le moment",
  emptyDescription: "Vos factures apparaîtront ici après votre premier achat.",
} as const;
