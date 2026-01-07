// ============================================
// SYSTÈME DE TRADUCTION CENTRALISÉ
// ============================================

export const translations = {
  // ============================================
  // COMMON / GLOBAL
  // ============================================
  common: {
    home: "Accueil",
    login: "Connexion",
    logout: "Déconnexion",
    back: "Retour",
    next: "Suivant",
    previous: "Précédent",
    submit: "Envoyer",
    cancel: "Annuler",
    save: "Enregistrer",
    delete: "Supprimer",
    edit: "Modifier",
    loading: "Chargement...",
    error: "Erreur",
    success: "Succès",
    month: "mois",
    year: "an",
    perMonth: "/mois",
    perYear: "/an",
    ttc: "TTC",
    free: "Gratuit",
    required: "Requis",
    optional: "Optionnel",
    seeMore: "Voir plus",
    seeLess: "Voir moins",
    contactSupport: "Contactez le support",
    needHelp: "Besoin d'aide ?",
    securePayment: "Paiement sécurisé par carte bancaire",
    professionalBilling: "Facturation professionnelle",
    cancelAnytime: "Annulation à tout moment",
  },

  // ============================================
  // NAVIGATION
  // ============================================
  nav: {
    exploitants: "Exploitants",
    simulationOpening: "Simulation ouverture",
    features: "Fonctionnalités",
    testimonials: "Témoignages",
    faq: "FAQ",
    exploitantPricing: "Tarifs exploitants",
    backToHome: "Retour à l'accueil",
    backToPricing: "Retour aux tarifs",
    backToSimulator: "Retour au simulateur",
  },

  // ============================================
  // LANDING PAGE
  // ============================================
  landing: {
    hero: {
      badge: "Solution n°1 pour les laveries automatiques",
      title: "Vos centrales collectent les données,",
      titleHighlight: "Lavcom Performances les transforme en décisions concrètes.",
      subtitle: "Lavcom Performances analyse les données de vos centrales de paiement et vous dit quoi faire pour augmenter la rentabilité de vos laveries.",
      cta: "Commencer maintenant",
      watchDemo: "Voir la démo",
    },
    futureExploitants: {
      badge: "Vous souhaitez ouvrir une laverie ?",
      title: "Simulez la rentabilité de votre projet",
      description: "Avant d'investir, testez différents scénarios : nombre de machines, tarifs, charges... Notre simulateur calcule votre seuil de rentabilité et votre bénéfice estimé.",
      features: {
        customMachines: "Configuration machines personnalisée",
        profitabilityThreshold: "Calcul du seuil de rentabilité",
        pdfExport: "Export PDF du bilan prévisionnel",
      },
      testSimulator: "Tester le simulateur",
      seePacks: "Voir les packs",
      simulatorLabel: "Simulateur",
      profitabilityLabel: "de rentabilité",
      packSimulator: "Pack Simulateur",
      packPremium: "Pack Premium",
      expertCall: "+ visio expert",
    },
    demo: {
      title: "Découvrez Lavcom Performances en action",
      subtitle: "Une interface intuitive pour piloter votre activité",
      playVideo: "Cliquez pour lancer la vidéo de démonstration",
      duration: "Durée : 2 minutes",
      features: {
        dashboard: "Dashboard temps réel",
        detailedAnalytics: "Analyses détaillées",
        alertsNotifications: "Alertes & notifications",
        fullHistory: "Historique complet",
      },
    },
    features: {
      title: "Tout ce dont vous avez besoin",
      subtitle: "Des outils puissants pour analyser et optimiser chaque aspect de votre laverie",
      items: {
        dashboards: {
          title: "Tableaux de bord en temps réel",
          description: "Visualisez vos performances avec des KPIs clairs et des graphiques interactifs.",
        },
        predictive: {
          title: "Analyses prédictives",
          description: "Anticipez les tendances et optimisez votre chiffre d'affaires grâce à l'IA.",
        },
        alerts: {
          title: "Alertes intelligentes",
          description: "Soyez notifié instantanément des anomalies et des opportunités.",
        },
        revenue: {
          title: "Suivi des revenus",
          description: "Analysez vos revenus par période, machine et mode de paiement.",
        },
        maintenance: {
          title: "Maintenance prédictive",
          description: "Réduisez les pannes grâce aux recommandations de maintenance.",
        },
        optimization: {
          title: "Optimisation opérationnelle",
          description: "Identifiez les heures creuses et maximisez le taux d'occupation.",
        },
      },
    },
    benefits: {
      title: "Des résultats concrets pour votre activité",
      subtitle: "Nos clients constatent des améliorations significatives dès les premiers mois d'utilisation.",
      items: [
        "Augmentez votre chiffre d'affaires jusqu'à 25%",
        "Réduisez les temps d'arrêt machine de 40%",
        "Gagnez 10h/semaine sur la gestion administrative",
        "Accédez à vos données depuis n'importe où",
      ],
    },
    testimonials: {
      title: "Ce que disent nos clients",
      subtitle: "Des gérants de laverie comme vous partagent leur expérience",
    },
    contact: {
      title: "Une question ?",
      subtitle: "Notre équipe est là pour vous aider à démarrer",
      namePlaceholder: "Votre nom",
      emailPlaceholder: "votre@email.com",
      messagePlaceholder: "Votre message...",
      send: "Envoyer le message",
      sending: "Envoi en cours...",
      successTitle: "Message envoyé !",
      successDescription: "Nous vous répondrons dans les plus brefs délais.",
      errorTitle: "Erreur",
      errorDescription: "Une erreur est survenue. Veuillez réessayer.",
    },
    faq: {
      title: "Questions fréquentes",
      subtitle: "Tout ce que vous devez savoir sur Lavcom Performances",
    },
  },

  // ============================================
  // PRICING PAGE (Exploitants)
  // ============================================
  pricing: {
    badge: "Tarifs Exploitants – Prix dégressif selon le nombre de laveries",
    title: "Choisissez votre abonnement",
    subtitle: "Plus vous avez de laveries, plus le prix par laverie diminue.",
    laundryCount: "Nombre de laveries",
    plans: {
      monthly: {
        title: "Mensuel",
        description: "Flexibilité maximale, sans engagement",
        perLaundry: "par laverie",
        cta: "Choisir l'abonnement mensuel",
      },
      annual: {
        title: "Annuel",
        badge: "Le plus populaire",
        description: "2 mois offerts par rapport au mensuel",
        perLaundry: "par laverie",
        saving: "Économie de",
        cta: "Choisir l'abonnement annuel",
      },
    },
    features: [
      "Accès à toutes les analyses",
      "Tableau de bord complet",
      "Export PDF des rapports",
      "Module Recommandations Lavcom Performances",
    ],
    tiers: {
      title: "Tarifs dégressifs en fonction du nombre de laveries",
      tier1: "1 à 2 laveries",
      tier2: "3 à 5 laveries",
      tier3: "6 laveries et +",
      perMonthPerLaundry: "€/mois par laverie",
      note: "Le montant affiché s'adapte automatiquement lorsque vous modifiez le nombre de laveries. L'abonnement annuel vous offre 2 mois gratuits.",
    },
    tierLabels: {
      tier1: "Tarif palier 1–2 laveries",
      tier2: "Tarif palier 3–5 laveries",
      tier3: "Tarif palier 6+ laveries",
    },
  },

  // ============================================
  // SIMULATOR PAGE (Free estimation)
  // ============================================
  simulator: {
    badge: "Estimation gratuite",
    title: "Simulateur de laverie",
    subtitle: "Répondez à quelques questions et obtenez un ordre de grandeur de votre futur chiffre d'affaires. L'analyse complète (seuil de rentabilité, charges, cycles/jour, rapport PDF) est réservée aux abonnés.",
    form: {
      title: "Estimation rapide",
      description: "Remplissez ces informations pour obtenir une première estimation",
      surface: "Surface du local (m²)",
      nbWashers: "Nombre de lave-linge",
      nbDryers: "Nombre de sèche-linge",
      avgPriceWash: "Prix moyen lavage (€)",
      avgPriceDry: "Prix moyen séchage (€)",
      trafficLevel: "Niveau de fréquentation attendu",
      trafficLevels: {
        low: "Prudent (3 cycles/jour)",
        medium: "Réaliste (5 cycles/jour)",
        high: "Ambitieux (7 cycles/jour)",
      },
      submit: "Calculer mon estimation",
    },
    results: {
      title: "Votre estimation",
      washRevenue: "CA lavage estimé",
      dryRevenue: "CA séchage estimé",
      totalRevenue: "CA total estimé",
      basedOn: "Estimation basée sur {cycles} cycles/machine/jour",
    },
    paywall: {
      title: "Analyse détaillée réservée aux abonnés",
      features: [
        "Calcul de votre seuil de rentabilité (CA/mois)",
        "Nombre de cycles/jour nécessaires pour couvrir vos charges",
        "Intégration de vos charges fixes et variables",
        "Analyse de la rentabilité estimée de votre projet",
        "Sauvegarde de plusieurs scénarios de laverie",
        "Rapport PDF prêt pour votre banque",
      ],
      cta: "Débloquer l'analyse complète",
      startingFrom: "À partir de",
    },
    note: {
      title: "Note :",
      content: "Cette estimation est basée sur des hypothèses moyennes. Elle ne remplace pas une étude complète de zone, de local et de charges.",
    },
    nav: {
      exploitantPricing: "Tarifs Exploitants",
      exploitantLogin: "Connexion Exploitant",
      simulatorLogin: "Connexion Simulateur",
    },
  },

  // ============================================
  // SUBSCRIBE SIMULATOR PAGE
  // ============================================
  subscribeSimulator: {
    badge: "Lavcom Performances Création",
    title: "Choisissez votre formule",
    subtitle: "Accédez au simulateur complet et préparez votre projet de laverie avec tous les outils dont vous avez besoin.",
    plans: {
      simulator: {
        title: "Pack Simulateur",
        description: "Accès complet à l'espace Futur exploitant",
        noCommitment: "Sans engagement",
        features: [
          "Simulateur détaillé : local, machines, charges",
          "Calcul du seuil de rentabilité",
          "Scénarios illimités",
          "Rapport PDF pour votre banque",
        ],
        cta: "Choisir le Pack Simulateur",
      },
      premium: {
        title: "Pack Premium",
        badge: "Recommandé",
        description: "Simulateur + accompagnement personnalisé",
        oneTimePayment: "Paiement unique",
        features: [
          "1 mois d'accès simulateur complet",
          "1h de visio avec un expert",
          "Analyse personnalisée de votre projet",
          "Conseils sur le choix du local",
          "Recommandations équipements",
          "Compte-rendu écrit post-visio",
        ],
        cta: "Choisir le Pack Premium",
      },
    },
    whatYouGet: "Ce que vous obtenez",
    features: {
      profitability: "Seuil de rentabilité",
      scenarios: "Scénarios multiples",
      reports: "Rapports PDF",
      unlimitedAccess: "Accès illimité",
    },
    alreadySubscribed: "Vous avez déjà un abonnement ?",
    connectHere: "Connectez-vous",
  },

  // ============================================
  // SUBSCRIBE PAGE (Exploitants)
  // ============================================
  subscribe: {
    steps: {
      company: "Entreprise",
      contact: "Contact",
      payment: "Paiement",
    },
    companyInfo: {
      title: "Informations de l'entreprise",
      description: "Ces informations seront utilisées pour la facturation.",
      raisonSociale: "Raison sociale",
      siret: "Numéro SIRET",
      siretHelp: "14 chiffres",
      adresse: "Adresse",
      codePostal: "Code postal",
      ville: "Ville",
    },
    contactInfo: {
      title: "Coordonnées du souscripteur",
      description: "La personne responsable de l'abonnement.",
      civility: "Civilité",
      civilityM: "M.",
      civilityMme: "Mme",
      firstName: "Prénom",
      lastName: "Nom",
      fonction: "Fonction",
      email: "Email",
      phone: "Téléphone",
    },
    payment: {
      title: "Récapitulatif et paiement",
      description: "Vérifiez vos informations avant de procéder au paiement.",
      laundryCount: "Nombre de laveries",
      selectedPlan: "Formule choisie",
      monthlyOption: "Mensuel",
      monthlyNoCommitment: "Sans engagement",
      annualOption: "Annuel",
      annualBonus: "2 mois offerts",
      summary: "Récapitulatif",
      company: "Entreprise",
      contact: "Contact",
      total: "Total",
    },
    validation: {
      incompleteInfo: "Informations incomplètes",
      fillAllFields: "Veuillez remplir tous les champs obligatoires.",
      invalidSiret: "SIRET invalide",
      siretMust14: "Le numéro SIRET doit contenir 14 chiffres.",
      invalidEmail: "Email invalide",
      validEmailRequired: "Veuillez entrer une adresse email valide.",
    },
    success: {
      title: "Inscription réussie !",
      description: "Votre abonnement a été activé. Bienvenue sur Lavcom Performances !",
    },
    proceedPayment: "Procéder au paiement",
    processing: "Traitement...",
  },

  // ============================================
  // LOGIN PAGE
  // ============================================
  login: {
    exploitant: {
      title: "Connexion",
      subtitle: "Entrez vos identifiants pour accéder à votre espace",
      leftPanelSubtitle: "Analysez les performances de vos laveries en un coup d'œil",
      stats: {
        realtime: "24/7",
        realtimeLabel: "Suivi temps réel",
        timeSaved: "+30%",
        timeSavedLabel: "Gain de temps",
        secureData: "100%",
        secureDataLabel: "Données sécurisées",
      },
    },
    simulator: {
      title: "Connexion Simulateur",
      subtitle: "Accédez à votre espace simulation",
      leftPanelSubtitle: "Simulez la rentabilité de votre future laverie",
      stats: {
        quickEstimate: "5 min",
        quickEstimateLabel: "Estimation rapide",
        bankReport: "PDF",
        bankReportLabel: "Rapport banque",
        unlimitedScenarios: "∞",
        unlimitedScenariosLabel: "Scénarios illimités",
      },
    },
    form: {
      email: "Email",
      emailPlaceholder: "votre@email.com",
      password: "Mot de passe",
      passwordPlaceholder: "••••••••",
      forgotPassword: "Mot de passe oublié ?",
      submit: "Se connecter",
      connecting: "Connexion...",
    },
    notSubscribed: "Pas encore abonné ?",
    discoverOffers: "Découvrir nos offres",
    discoverSimulatorPacks: "Découvrir les packs simulateur",
    switchToExploitant: "Vous êtes exploitant ?",
    exploitantLogin: "Connexion exploitant",
    switchToSimulator: "Vous voulez ouvrir une laverie ?",
    simulatorLogin: "Connexion simulateur",
    welcomeExploitant: "Bienvenue sur Lavcom Performances",
    welcomeSimulator: "Bienvenue sur Lavcom Performances Création",
    loginSuccess: "Connexion réussie",
    // Demo mode
    demoMode: "Connectez-vous pour accéder à la démo interactive",
    demoTitle: "Accéder à la démo",
    demoSubtitle: "Connectez-vous ou créez un compte pour explorer la démo",
  },

  // ============================================
  // VALIDATION MESSAGES
  // ============================================
  validation: {
    nameRequired: "Le nom est requis",
    nameTooLong: "Le nom est trop long",
    invalidEmail: "Email invalide",
    emailTooLong: "Email trop long",
    messageMinLength: "Le message doit contenir au moins 10 caractères",
    messageMaxLength: "Le message est trop long (max 1000 caractères)",
  },

  // ============================================
  // UNITS & FORMATS
  // ============================================
  units: {
    euro: "€",
    euroPerMonth: "€/mois",
    euroPerYear: "€/an",
    squareMeters: "m²",
    cyclesPerDay: "cycles/jour",
  },
} as const;

// Type helper pour l'autocomplétion
export type TranslationKeys = typeof translations;

// Fonction helper pour accéder aux traductions
export function t<K extends keyof TranslationKeys>(section: K): TranslationKeys[K] {
  return translations[section];
}

export default translations;
