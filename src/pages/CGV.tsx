import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import lavcomLogo from "@/assets/lavcom-performances-header.png";
import { SEOHead } from "@/components/seo/SEOHead";
import { SIMULATOR_PACKS, LAUNDROMAT_PRICING } from "@/config/pricingConfig";

const LAST_UPDATE = "22 décembre 2024";

const SECTIONS = [
  { id: "editeur", label: "1. Identité de l'éditeur" },
  { id: "objet", label: "2. Objet" },
  { id: "acces", label: "3. Accès et comptes" },
  { id: "prix", label: "4. Prix et paiement" },
  { id: "retractation", label: "5. Droit de rétractation" },
  { id: "responsabilite", label: "6. Responsabilité" },
  { id: "support", label: "7. Support et contact" },
  { id: "resiliation", label: "8. Résiliation" },
  { id: "propriete", label: "9. Propriété intellectuelle" },
  { id: "droit", label: "10. Droit applicable" },
];

export default function CGV() {
  const location = useLocation();

  // Scroll to anchor on mount
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
        title="Conditions Générales de Vente et d'Utilisation"
        description="CGV et CGU de Lavcom Performances - Conditions d'utilisation du simulateur et de la plateforme d'analyse pour laveries automatiques."
        url="/cgv"
      />
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={lavcomLogo} alt="Lavcom Performances" className="h-10 w-auto" />
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm">
                <Home className="mr-2 h-4 w-4" />
                Accueil
              </Button>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            {/* Title and update date */}
            <div className="mb-8">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                Conditions Générales de Vente et d'Utilisation
              </h1>
              <p className="text-sm text-muted-foreground">
                Dernière mise à jour : {LAST_UPDATE}
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
              {/* 1. Identité éditeur */}
              <section id="editeur" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">1. Identité de l'éditeur</h2>
                <p className="text-muted-foreground mb-4">
                  Les présentes Conditions Générales de Vente et d'Utilisation (ci-après « CGV/CGU ») 
                  sont conclues entre :
                </p>
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <ul className="text-muted-foreground space-y-2 list-none pl-0">
                    <li><strong>Raison sociale :</strong> My'Po SARL</li>
                    <li><strong>Marque commerciale :</strong> Lavcom Performances</li>
                    <li><strong>Siège social :</strong> 15 rue des Lavandières, 75001 Paris, France</li>
                    <li><strong>SIRET :</strong> 123 456 789 00012</li>
                    <li><strong>Capital social :</strong> 10 000 €</li>
                    <li><strong>RCS :</strong> Paris B 123 456 789</li>
                    <li><strong>TVA intracommunautaire :</strong> FR 12 123456789</li>
                    <li><strong>Email :</strong> <a href="mailto:contact@lavcom.fr" className="text-primary hover:underline">contact@lavcom.fr</a></li>
                    <li><strong>Directeur de la publication :</strong> [Nom du gérant]</li>
                  </ul>
                </div>
                <p className="text-muted-foreground mt-4">
                  Ci-après désigné « l'Éditeur » ou « Lavcom Performances ».
                </p>
                <p className="text-muted-foreground">
                  Et toute personne physique ou morale, professionnelle ou non, souhaitant utiliser 
                  les services proposés sur le site, ci-après désignée « l'Utilisateur » ou « le Client ».
                </p>
              </section>

              {/* 2. Objet */}
              <section id="objet" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">2. Objet</h2>
                <p className="text-muted-foreground mb-4">
                  Les présentes CGV/CGU ont pour objet de définir les conditions d'accès et d'utilisation 
                  des services proposés par Lavcom Performances, à savoir :
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">🎯 Simulateur de laverie</h3>
                    <p className="text-sm text-muted-foreground">
                      Outil d'aide à la décision permettant aux futurs exploitants d'estimer 
                      le chiffre d'affaires potentiel et la rentabilité d'un projet de laverie automatique.
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-medium text-foreground mb-2">📊 Plateforme Performances</h3>
                    <p className="text-sm text-muted-foreground">
                      Tableau de bord d'analyse et de suivi des performances pour les exploitants 
                      de laveries automatiques (KPIs, rapports, recommandations).
                    </p>
                  </div>
                </div>
              </section>

              {/* 3. Accès et comptes */}
              <section id="acces" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">3. Accès, comptes et obligations de l'utilisateur</h2>
                
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">3.1 Création de compte</h3>
                <p className="text-muted-foreground">
                  L'accès aux services nécessite la création d'un compte utilisateur. L'Utilisateur 
                  s'engage à fournir des informations exactes et à jour, et à maintenir la confidentialité 
                  de ses identifiants de connexion.
                </p>

                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">3.2 Obligations de l'utilisateur</h3>
                <p className="text-muted-foreground mb-2">L'Utilisateur s'engage à :</p>
                <ul className="text-muted-foreground list-disc pl-5 space-y-1">
                  <li>Utiliser les services conformément à leur destination</li>
                  <li>Ne pas tenter de contourner les mesures de sécurité</li>
                  <li>Ne pas revendre ou céder l'accès à son compte</li>
                  <li>Respecter les droits de propriété intellectuelle de l'Éditeur</li>
                  <li>Fournir des données d'exploitation exactes pour les analyses</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">3.3 Sécurité du compte</h3>
                <p className="text-muted-foreground">
                  L'Utilisateur est seul responsable de la sécurité de son compte et de son mot de passe. 
                  Toute activité réalisée depuis son compte est présumée effectuée par lui.
                </p>
              </section>

              {/* 4. Prix et paiement */}
              <section id="prix" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">4. Prix et modalités de paiement</h2>
                
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">4.1 Tarifs du simulateur (paiement unique)</h3>
                <p className="text-muted-foreground mb-4">
                  Les packs simulateur sont proposés sous forme de paiement unique donnant accès 
                  au service pour une durée limitée :
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium text-foreground">Pack</th>
                        <th className="text-left p-3 font-medium text-foreground">Prix TTC</th>
                        <th className="text-left p-3 font-medium text-foreground">Durée d'accès</th>
                        <th className="text-left p-3 font-medium text-foreground">Projets inclus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {SIMULATOR_PACKS.map((pack) => (
                        <tr key={pack.id} className="bg-background">
                          <td className="p-3 text-muted-foreground capitalize">
                            {pack.id}
                            {pack.isRecommended && (
                              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                Recommandé
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground font-medium">{pack.price} € TTC</td>
                          <td className="p-3 text-muted-foreground">{pack.accessDays} jours</td>
                          <td className="p-3 text-muted-foreground">{pack.projectsIncluded} projet(s)</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3 className="text-lg font-medium text-foreground mt-6 mb-2">4.2 Tarifs de la plateforme Performances (abonnement)</h3>
                <p className="text-muted-foreground mb-4">
                  L'accès à la plateforme Performances est proposé sous forme d'abonnement mensuel ou annuel, 
                  avec tarification dégressive selon le nombre de laveries :
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium text-foreground">Nombre de laveries</th>
                        <th className="text-left p-3 font-medium text-foreground">Prix / laverie / mois TTC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="bg-background">
                        <td className="p-3 text-muted-foreground">1-2 laveries</td>
                        <td className="p-3 text-muted-foreground">{LAUNDROMAT_PRICING.monthly.tier1.pricePerLaundromat} € / mois</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-muted-foreground">3-5 laveries</td>
                        <td className="p-3 text-muted-foreground">{LAUNDROMAT_PRICING.monthly.tier2.pricePerLaundromat} € / mois</td>
                      </tr>
                      <tr className="bg-background">
                        <td className="p-3 text-muted-foreground">6+ laveries</td>
                        <td className="p-3 text-muted-foreground">{LAUNDROMAT_PRICING.monthly.tier3.pricePerLaundromat} € / mois</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Abonnement annuel : 10 mois payés, 2 mois offerts.
                </p>

                <h3 className="text-lg font-medium text-foreground mt-6 mb-2">4.3 Modalités de paiement</h3>
                <p className="text-muted-foreground">
                  Le paiement s'effectue par carte bancaire via notre prestataire sécurisé Stripe. 
                  Tous les prix sont indiqués en euros TTC (TVA incluse au taux en vigueur). 
                  Le paiement est exigible immédiatement à la commande.
                </p>
              </section>

              {/* 5. Droit de rétractation */}
              <section id="retractation" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">5. Droit de rétractation</h2>
                
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.1 Pour les consommateurs (B2C)</h3>
                <p className="text-muted-foreground mb-4">
                  Conformément aux articles L.221-18 et suivants du Code de la consommation, 
                  le consommateur dispose d'un délai de 14 jours à compter de la souscription 
                  pour exercer son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.
                </p>
                
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                  <p className="text-amber-700 dark:text-amber-400 text-sm font-medium mb-2">
                    ⚠️ Exception pour les services numériques
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation 
                    ne peut être exercé pour les contrats de fourniture de contenu numérique 
                    <strong> dont l'exécution a commencé avec l'accord exprès du consommateur</strong> 
                    et son renoncement exprès à son droit de rétractation.
                  </p>
                </div>

                <p className="text-muted-foreground">
                  En accédant immédiatement aux services après le paiement (simulateur, plateforme), 
                  l'Utilisateur reconnaît avoir expressément demandé l'exécution immédiate du service 
                  et renonce à son droit de rétractation.
                </p>

                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.2 Pour les professionnels (B2B)</h3>
                <p className="text-muted-foreground">
                  Les professionnels (personnes morales ou personnes physiques agissant dans le cadre 
                  de leur activité professionnelle) ne bénéficient pas du droit de rétractation prévu 
                  par le Code de la consommation.
                </p>
              </section>

              {/* 6. Responsabilité */}
              <section id="responsabilite" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">6. Responsabilité et limitation</h2>
                
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">6.1 Nature des services</h3>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                  <p className="text-blue-700 dark:text-blue-400 text-sm font-medium mb-2">
                    ℹ️ Outil d'aide à la décision
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Le simulateur Lavcom Performances est un <strong>outil d'aide à la décision</strong> 
                    basé sur des algorithmes statistiques et des données de marché. Les résultats 
                    fournis sont des estimations indicatives et ne constituent en aucun cas une 
                    garantie de résultat ou de rentabilité.
                  </p>
                </div>

                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">6.2 Limitation de responsabilité</h3>
                <p className="text-muted-foreground mb-2">L'Éditeur ne saurait être tenu responsable :</p>
                <ul className="text-muted-foreground list-disc pl-5 space-y-1">
                  <li>Des décisions d'investissement prises par l'Utilisateur sur la base des simulations</li>
                  <li>Des pertes financières directes ou indirectes liées à l'utilisation du service</li>
                  <li>De l'exactitude des données fournies par l'Utilisateur</li>
                  <li>Des interruptions temporaires du service pour maintenance</li>
                  <li>Des dommages résultant de la perte ou de l'altération des données</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">6.3 Obligations de moyens</h3>
                <p className="text-muted-foreground">
                  L'Éditeur s'engage à mettre en œuvre tous les moyens raisonnables pour assurer 
                  un accès continu et sécurisé aux services, sans toutefois garantir une disponibilité 
                  de 100%. La responsabilité de l'Éditeur est limitée au montant des sommes versées 
                  par l'Utilisateur au cours des 12 derniers mois.
                </p>
              </section>

              {/* 7. Support et contact */}
              <section id="support" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">7. Support et contact</h2>
                <p className="text-muted-foreground mb-4">
                  Notre équipe support est disponible pour répondre à vos questions :
                </p>
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <ul className="text-muted-foreground space-y-2 list-none pl-0">
                    <li>
                      <strong>Email :</strong>{" "}
                      <a href="mailto:contact@lavcom.fr" className="text-primary hover:underline">
                        contact@lavcom.fr
                      </a>
                    </li>
                    <li><strong>Délai de réponse :</strong> 48h ouvrées maximum</li>
                    <li><strong>Horaires :</strong> Du lundi au vendredi, 9h-18h (heure de Paris)</li>
                  </ul>
                </div>
                <p className="text-muted-foreground mt-4">
                  Pour les demandes relatives à vos données personnelles, veuillez contacter notre 
                  Délégué à la Protection des Données (DPO) à l'adresse : 
                  <a href="mailto:dpo@lavcom.fr" className="text-primary hover:underline ml-1">dpo@lavcom.fr</a>
                </p>
              </section>

              {/* 8. Résiliation */}
              <section id="resiliation" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">8. Résiliation et suppression de compte</h2>
                
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">8.1 Résiliation par l'Utilisateur</h3>
                <p className="text-muted-foreground">
                  L'Utilisateur peut résilier son abonnement à tout moment depuis son espace client. 
                  La résiliation prend effet à la fin de la période de facturation en cours. 
                  Aucun remboursement prorata temporis n'est effectué.
                </p>

                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">8.2 Suppression de compte</h3>
                <p className="text-muted-foreground">
                  L'Utilisateur peut demander la suppression de son compte et de ses données 
                  à tout moment en contactant le support. La suppression est effective sous 30 jours.
                </p>

                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">8.3 Résiliation par l'Éditeur</h3>
                <p className="text-muted-foreground">
                  L'Éditeur se réserve le droit de suspendre ou résilier l'accès d'un Utilisateur 
                  en cas de non-respect des présentes CGV/CGU, sans préjudice de tout dommages-intérêts.
                </p>
              </section>

              {/* 9. Propriété intellectuelle */}
              <section id="propriete" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">9. Propriété intellectuelle</h2>
                <p className="text-muted-foreground mb-4">
                  L'ensemble des éléments composant le site et les services (textes, graphismes, 
                  logiciels, bases de données, algorithmes, marques, logos, etc.) sont la propriété 
                  exclusive de My'Po SARL et sont protégés par les lois françaises et internationales 
                  relatives à la propriété intellectuelle.
                </p>
                <p className="text-muted-foreground">
                  Toute reproduction, représentation, modification, publication, adaptation de tout 
                  ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, 
                  est interdite, sauf autorisation écrite préalable de l'Éditeur.
                </p>
              </section>

              {/* 10. Droit applicable */}
              <section id="droit" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-foreground mb-4">10. Droit applicable et juridiction</h2>
                <p className="text-muted-foreground mb-4">
                  Les présentes CGV/CGU sont soumises au droit français.
                </p>
                <p className="text-muted-foreground mb-4">
                  En cas de litige, les parties s'engagent à rechercher une solution amiable. 
                  À défaut d'accord, le litige sera porté devant les tribunaux compétents de Paris.
                </p>
                <p className="text-muted-foreground">
                  Pour les consommateurs résidant dans l'Union Européenne, conformément aux dispositions 
                  du Code de la consommation concernant le règlement amiable des litiges, l'Utilisateur 
                  peut recourir gratuitement au service de médiation proposé par l'Éditeur ou à tout 
                  médiateur de son choix.
                </p>
              </section>
            </div>

            {/* Back to top */}
            <div className="mt-12 pt-6 border-t border-border flex justify-center">
              <a
                href="#editeur"
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
