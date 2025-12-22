import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, List, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import lavcomLogo from "@/assets/lavcom-performances-header.png";
import { SEOHead } from "@/components/seo/SEOHead";
import { Badge } from "@/components/ui/badge";

const LAST_UPDATE = "22 décembre 2024";

const SECTIONS = [
  { id: "responsable", label: "1. Responsable du traitement" },
  { id: "donnees", label: "2. Données collectées" },
  { id: "finalites", label: "3. Finalités du traitement" },
  { id: "bases-legales", label: "4. Bases légales" },
  { id: "sous-traitants", label: "5. Sous-traitants" },
  { id: "durees", label: "6. Durées de conservation" },
  { id: "droits", label: "7. Vos droits" },
  { id: "cookies", label: "8. Cookies et traceurs" },
  { id: "contact", label: "9. Contact DPO" },
];

export default function PolitiqueConfidentialite() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [location.hash]);

  return (
    <>
      <SEOHead
        title="Politique de confidentialité"
        description="Politique de confidentialité de Lavcom Performances - Protection de vos données personnelles, cookies, droits RGPD et sous-traitants."
        url="/politique-confidentialite"
      />
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={lavcomLogo} alt="Lavcom Performances" className="h-10 w-auto" />
            </Link>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs hidden sm:flex">
                🇫🇷 Français
              </Badge>
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <Home className="mr-2 h-4 w-4" />
                  Accueil
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            {/* Title and update date */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                    Politique de confidentialité
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Dernière mise à jour : {LAST_UPDATE}
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground">
                Chez Lavcom Performances, nous nous engageons à protéger vos données personnelles 
                conformément au Règlement Général sur la Protection des Données (RGPD) et à la 
                loi Informatique et Libertés.
              </p>
            </div>

            {/* Language notice */}
            <div className="mb-8 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                🌐 Cette politique est disponible en français. 
                <span className="opacity-70"> English version coming soon.</span>
              </p>
            </div>

            {/* Table of contents */}
            <nav className="mb-10 p-4 md:p-6 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <List className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Sommaire</h2>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SECTIONS.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Sections */}
            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-10">
              {/* 1. Responsable du traitement */}
              <section id="responsable" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">1. Responsable du traitement</h2>
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <ul className="text-muted-foreground space-y-2 list-none pl-0">
                    <li><strong>Raison sociale :</strong> My'Po SARL</li>
                    <li><strong>Marque commerciale :</strong> Lavcom Performances</li>
                    <li><strong>Siège social :</strong> 15 rue des Lavandières, 75001 Paris, France</li>
                    <li><strong>SIRET :</strong> 123 456 789 00012</li>
                    <li><strong>Email DPO :</strong> <a href="mailto:dpo@lavcom.fr" className="text-primary hover:underline">dpo@lavcom.fr</a></li>
                  </ul>
                </div>
              </section>

              {/* 2. Données collectées */}
              <section id="donnees" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">2. Données collectées</h2>
                <p className="text-muted-foreground mb-4">
                  Nous collectons différentes catégories de données selon votre utilisation du service :
                </p>
                
                <div className="space-y-4">
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">👤 Données de compte</h3>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Nom, prénom, adresse email</li>
                      <li>Nom de l'entreprise, numéro SIRET (facultatif)</li>
                      <li>Numéro de téléphone (facultatif)</li>
                      <li>Photo de profil (facultatif)</li>
                    </ul>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">💳 Données de paiement</h3>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Identifiant client Stripe</li>
                      <li>Historique des achats (montant, date, plan)</li>
                      <li><strong>Note :</strong> Les coordonnées bancaires sont traitées exclusivement par Stripe et ne sont jamais stockées sur nos serveurs</li>
                    </ul>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">🔐 Données de sécurité</h3>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Journaux de connexion (date, heure, type d'appareil, navigateur)</li>
                      <li>Hash de l'adresse IP (non réversible)</li>
                      <li>Détection de nouvel appareil</li>
                    </ul>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">📊 Données d'exploitation</h3>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Données de laveries (nom, adresse, configuration)</li>
                      <li>Données d'opérations importées via CSV (montants, dates, machines)</li>
                      <li>Objectifs et paramètres de coûts</li>
                    </ul>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">✉️ Données de contact</h3>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Messages envoyés via le formulaire de contact</li>
                      <li>Adresse email, nom, sujet du message</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 3. Finalités */}
              <section id="finalites" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">3. Finalités du traitement</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium text-foreground">Finalité</th>
                        <th className="text-left p-3 font-medium text-foreground">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">🎯 Fourniture du service</td>
                        <td className="p-3 text-muted-foreground">Création de compte, accès au simulateur et à la plateforme, génération de rapports</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">🔒 Sécurité</td>
                        <td className="p-3 text-muted-foreground">Protection des comptes, détection de connexions suspectes, prévention de la fraude</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">💰 Facturation</td>
                        <td className="p-3 text-muted-foreground">Traitement des paiements, gestion des abonnements, facturation</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">🤝 Support</td>
                        <td className="p-3 text-muted-foreground">Réponse aux demandes de contact, assistance technique, communication produit</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">📈 Amélioration</td>
                        <td className="p-3 text-muted-foreground">Analyse d'usage anonymisée, amélioration de l'expérience utilisateur</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 4. Bases légales */}
              <section id="bases-legales" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">4. Bases légales du traitement</h2>
                
                <div className="space-y-4">
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">📝 Exécution du contrat (Art. 6.1.b RGPD)</h3>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Gestion du compte utilisateur</li>
                      <li>Fourniture des services souscrits (simulateur, plateforme)</li>
                      <li>Traitement des paiements et facturation</li>
                    </ul>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">⚖️ Intérêt légitime (Art. 6.1.f RGPD)</h3>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Sécurité des comptes et prévention de la fraude</li>
                      <li>Amélioration du service via analytics anonymisés</li>
                      <li>Support client et communication opérationnelle</li>
                    </ul>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">📋 Obligations légales (Art. 6.1.c RGPD)</h3>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Conservation des données de facturation (obligations comptables)</li>
                      <li>Réponse aux réquisitions judiciaires</li>
                    </ul>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">✅ Consentement (Art. 6.1.a RGPD)</h3>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Cookies analytiques et marketing (via la bannière de consentement)</li>
                      <li>Newsletter et communications promotionnelles (si applicable)</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 5. Sous-traitants */}
              <section id="sous-traitants" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">5. Sous-traitants et transferts de données</h2>
                <p className="text-muted-foreground mb-4">
                  Nous faisons appel aux sous-traitants suivants pour le fonctionnement du service :
                </p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium text-foreground">Sous-traitant</th>
                        <th className="text-left p-3 font-medium text-foreground">Usage</th>
                        <th className="text-left p-3 font-medium text-foreground">Localisation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">Supabase</td>
                        <td className="p-3 text-muted-foreground">Base de données, authentification, stockage fichiers</td>
                        <td className="p-3 text-muted-foreground">🇪🇺 UE (AWS Frankfurt)</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">Stripe</td>
                        <td className="p-3 text-muted-foreground">Paiements, gestion des abonnements</td>
                        <td className="p-3 text-muted-foreground">🇪🇺 UE (Dublin) + 🇺🇸 US</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">Resend</td>
                        <td className="p-3 text-muted-foreground">Envoi d'emails transactionnels</td>
                        <td className="p-3 text-muted-foreground">🇺🇸 US</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">Google Analytics (via GTM)</td>
                        <td className="p-3 text-muted-foreground">Mesure d'audience (avec consentement)</td>
                        <td className="p-3 text-muted-foreground">🇺🇸 US</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">Lovable</td>
                        <td className="p-3 text-muted-foreground">Hébergement de l'application</td>
                        <td className="p-3 text-muted-foreground">🇪🇺 UE</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
                        Transferts hors UE
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Certains sous-traitants sont basés aux États-Unis. Ces transferts sont encadrés par les 
                        Clauses Contractuelles Types (CCT) de la Commission Européenne et/ou le EU-US Data Privacy Framework.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 6. Durées de conservation */}
              <section id="durees" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">6. Durées de conservation</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium text-foreground">Données</th>
                        <th className="text-left p-3 font-medium text-foreground">Durée</th>
                        <th className="text-left p-3 font-medium text-foreground">Justification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">Compte utilisateur</td>
                        <td className="p-3 text-muted-foreground">Durée de la relation + 3 ans</td>
                        <td className="p-3 text-muted-foreground">Prescription commerciale</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">Données de facturation</td>
                        <td className="p-3 text-muted-foreground">10 ans</td>
                        <td className="p-3 text-muted-foreground">Obligations comptables légales</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">Journaux de connexion</td>
                        <td className="p-3 text-muted-foreground">90 jours (configurable)</td>
                        <td className="p-3 text-muted-foreground">Sécurité du compte</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">Messages de contact</td>
                        <td className="p-3 text-muted-foreground">3 ans</td>
                        <td className="p-3 text-muted-foreground">Suivi des demandes</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">Données d'exploitation</td>
                        <td className="p-3 text-muted-foreground">Durée du compte</td>
                        <td className="p-3 text-muted-foreground">Fourniture du service</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">Cookies analytiques</td>
                        <td className="p-3 text-muted-foreground">13 mois maximum</td>
                        <td className="p-3 text-muted-foreground">Recommandation CNIL</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  💡 <strong>Journaux de connexion :</strong> Vous pouvez personnaliser la durée de rétention 
                  (30, 60 ou 90 jours) depuis les paramètres de sécurité de votre compte.
                </p>
              </section>

              {/* 7. Vos droits */}
              <section id="droits" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">7. Vos droits</h2>
                <p className="text-muted-foreground mb-4">
                  Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">👁️ Droit d'accès</h3>
                    <p className="text-sm text-muted-foreground">
                      Obtenir une copie de toutes vos données personnelles
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">✏️ Droit de rectification</h3>
                    <p className="text-sm text-muted-foreground">
                      Corriger les données inexactes ou incomplètes
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">🗑️ Droit à l'effacement</h3>
                    <p className="text-sm text-muted-foreground">
                      Demander la suppression de vos données (« droit à l'oubli »)
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">⏸️ Droit à la limitation</h3>
                    <p className="text-sm text-muted-foreground">
                      Limiter temporairement le traitement de vos données
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">📦 Droit à la portabilité</h3>
                    <p className="text-sm text-muted-foreground">
                      Récupérer vos données dans un format structuré
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">🚫 Droit d'opposition</h3>
                    <p className="text-sm text-muted-foreground">
                      Vous opposer au traitement pour motifs légitimes
                    </p>
                  </div>
                </div>

                <p className="text-muted-foreground mt-4">
                  Pour exercer ces droits, envoyez un email à{" "}
                  <a href="mailto:dpo@lavcom.fr" className="text-primary hover:underline">dpo@lavcom.fr</a>{" "}
                  en précisant votre demande et en joignant une pièce d'identité.
                </p>

                <p className="text-sm text-muted-foreground mt-4">
                  Vous pouvez également introduire une réclamation auprès de la{" "}
                  <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    CNIL
                  </a>{" "}
                  (Commission Nationale de l'Informatique et des Libertés).
                </p>
              </section>

              {/* 8. Cookies */}
              <section id="cookies" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">8. Cookies et traceurs</h2>
                
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">8.1 Qu'est-ce qu'un cookie ?</h3>
                <p className="text-muted-foreground mb-4">
                  Un cookie est un petit fichier texte stocké sur votre appareil lors de la visite d'un site web. 
                  Il permet de mémoriser vos préférences et d'améliorer votre expérience.
                </p>

                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">8.2 Cookies utilisés</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium text-foreground">Type</th>
                        <th className="text-left p-3 font-medium text-foreground">Nom</th>
                        <th className="text-left p-3 font-medium text-foreground">Finalité</th>
                        <th className="text-left p-3 font-medium text-foreground">Durée</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">🔒 Essentiel</td>
                        <td className="p-3 text-muted-foreground font-mono text-xs">sb-*-auth-token</td>
                        <td className="p-3 text-muted-foreground">Session d'authentification</td>
                        <td className="p-3 text-muted-foreground">Session</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">🔒 Essentiel</td>
                        <td className="p-3 text-muted-foreground font-mono text-xs">lavcom_cookie_consent</td>
                        <td className="p-3 text-muted-foreground">Mémorisation choix cookies</td>
                        <td className="p-3 text-muted-foreground">1 an</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">🔒 Essentiel</td>
                        <td className="p-3 text-muted-foreground font-mono text-xs">lavcom_locale</td>
                        <td className="p-3 text-muted-foreground">Préférence de langue</td>
                        <td className="p-3 text-muted-foreground">1 an</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-foreground font-medium">📊 Analytique</td>
                        <td className="p-3 text-muted-foreground font-mono text-xs">_ga, _gid</td>
                        <td className="p-3 text-muted-foreground">Google Analytics (si accepté)</td>
                        <td className="p-3 text-muted-foreground">13 mois</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-lg font-medium text-foreground mt-6 mb-2">8.3 Google Tag Manager (GTM)</h3>
                <p className="text-muted-foreground mb-4">
                  Nous utilisons Google Tag Manager pour gérer les tags analytiques. GTM ne collecte 
                  pas de données personnelles directement, mais facilite le déploiement de Google Analytics 
                  et d'autres outils de mesure.
                </p>

                <h3 className="text-lg font-medium text-foreground mt-6 mb-2">8.4 Comment refuser les cookies ?</h3>
                <ul className="text-muted-foreground list-disc pl-5 space-y-2 mb-4">
                  <li>
                    <strong>Bannière de consentement :</strong> Lors de votre première visite, cliquez sur 
                    « Refuser » ou « Personnaliser » pour choisir les cookies acceptés.
                  </li>
                  <li>
                    <strong>Paramètres du navigateur :</strong> Vous pouvez configurer votre navigateur pour 
                    bloquer tous les cookies ou les cookies tiers.
                  </li>
                  <li>
                    <strong>Opt-out Google Analytics :</strong>{" "}
                    <a 
                      href="https://tools.google.com/dlpage/gaoptout" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Installer le module de désactivation Google Analytics
                    </a>
                  </li>
                </ul>

                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <p className="text-sm text-muted-foreground">
                    ⚠️ Le refus des cookies essentiels peut empêcher le bon fonctionnement du service 
                    (authentification, préférences).
                  </p>
                </div>
              </section>

              {/* 9. Contact DPO */}
              <section id="contact" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">9. Contact DPO</h2>
                <p className="text-muted-foreground mb-4">
                  Pour toute question concernant cette politique ou pour exercer vos droits, 
                  vous pouvez nous contacter :
                </p>
                <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
                  <ul className="text-muted-foreground space-y-3 list-none pl-0">
                    <li className="flex items-center gap-2">
                      <span className="text-lg">📧</span>
                      <span>
                        <strong>Email DPO :</strong>{" "}
                        <a href="mailto:dpo@lavcom.fr" className="text-primary hover:underline">
                          dpo@lavcom.fr
                        </a>
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-lg">✉️</span>
                      <span>
                        <strong>Email général :</strong>{" "}
                        <a href="mailto:contact@lavcom.fr" className="text-primary hover:underline">
                          contact@lavcom.fr
                        </a>
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-lg">📮</span>
                      <span>
                        <strong>Adresse postale :</strong> My'Po SARL - DPO, 15 rue des Lavandières, 75001 Paris
                      </span>
                    </li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-4">
                    Délai de réponse : 30 jours maximum conformément au RGPD.
                  </p>
                </div>
              </section>
            </div>

            {/* Back to top */}
            <div className="mt-12 pt-6 border-t border-border flex justify-center">
              <a
                href="#responsable"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                ↑ Retour en haut
              </a>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
