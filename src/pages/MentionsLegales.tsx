import { Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import lavcomLogo from "@/assets/lavcom-performances-header.png";
import { SEOHead } from "@/components/seo/SEOHead";

export default function MentionsLegales() {
  return (
    <>
      <SEOHead 
        title="Mentions légales"
        description="Mentions légales de Lavcom Performances - Informations sur l'éditeur, l'hébergement et la propriété intellectuelle."
        url="/mentions-legales"
      />
      <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={lavcomLogo} alt="Lavcom Analytics" className="h-10 w-auto" />
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
        <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">
            Mentions légales
          </h1>

          {/* Éditeur */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Éditeur du site</h2>
            <p className="text-muted-foreground mb-2">
              Le site Lavcom Performances est édité par :
            </p>
            <ul className="text-muted-foreground space-y-1 list-none pl-0">
              <li><strong>Raison sociale :</strong> LAVCOM SAS</li>
              <li><strong>Siège social :</strong> Paris, France</li>
              <li><strong>SIRET :</strong> XXX XXX XXX XXXXX</li>
              <li><strong>Capital social :</strong> XX XXX €</li>
              <li><strong>Email :</strong> contact@lavcom.fr</li>
              <li><strong>Téléphone :</strong> 01 23 45 67 89</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              <strong>Directeur de la publication :</strong> [Nom du directeur]
            </p>
          </section>

          {/* Hébergement */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Hébergement</h2>
            <p className="text-muted-foreground">
              Ce site est hébergé par :
            </p>
            <ul className="text-muted-foreground space-y-1 list-none pl-0 mt-2">
              <li><strong>Hébergeur :</strong> Lovable / Supabase</li>
              <li><strong>Adresse :</strong> Services cloud européens</li>
            </ul>
          </section>

          {/* Propriété intellectuelle */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Propriété intellectuelle</h2>
            <p className="text-muted-foreground">
              L'ensemble des éléments composant ce site (textes, graphismes, logiciels, photographies, images, vidéos, sons, plans, logos, marques, créations et œuvres protégeables diverses, bases de données, etc.) ainsi que le site lui-même, relèvent des législations françaises et internationales sur le droit d'auteur et la propriété intellectuelle.
            </p>
            <p className="text-muted-foreground mt-2">
              Ces éléments sont la propriété exclusive de LAVCOM SAS. Toute reproduction, représentation, utilisation ou adaptation, sous quelque forme que ce soit, de tout ou partie de ces éléments, sans l'accord préalable et écrit de LAVCOM SAS, est strictement interdite.
            </p>
          </section>

          {/* Politique de confidentialité */}
          <section id="confidentialite" className="mb-8 scroll-mt-20">
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Politique de confidentialité</h2>
            
            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">4.1 Collecte des données</h3>
            <p className="text-muted-foreground">
              LAVCOM SAS collecte les données personnelles suivantes dans le cadre de l'utilisation du service :
            </p>
            <ul className="text-muted-foreground list-disc pl-5 mt-2 space-y-1">
              <li>Nom, prénom, adresse email</li>
              <li>Informations de l'entreprise (raison sociale, SIRET, adresse)</li>
              <li>Données d'exploitation des laveries (CA, opérations, machines)</li>
              <li>Données de connexion et d'utilisation du service</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">4.2 Finalités du traitement</h3>
            <p className="text-muted-foreground">
              Les données collectées sont utilisées pour :
            </p>
            <ul className="text-muted-foreground list-disc pl-5 mt-2 space-y-1">
              <li>La fourniture et l'amélioration du service Lavcom Performances</li>
              <li>La gestion de la relation client et du support</li>
              <li>L'envoi d'informations relatives au service (mises à jour, nouveautés)</li>
              <li>L'établissement de statistiques anonymisées</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">4.3 Durée de conservation</h3>
            <p className="text-muted-foreground">
              Les données sont conservées pendant toute la durée de la relation contractuelle, puis archivées conformément aux obligations légales (5 ans pour les données comptables, 3 ans pour les données commerciales).
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">4.4 Vos droits</h3>
            <p className="text-muted-foreground">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="text-muted-foreground list-disc pl-5 mt-2 space-y-1">
              <li>Droit d'accès à vos données personnelles</li>
              <li>Droit de rectification des données inexactes</li>
              <li>Droit à l'effacement (« droit à l'oubli »)</li>
              <li>Droit à la limitation du traitement</li>
              <li>Droit à la portabilité des données</li>
              <li>Droit d'opposition au traitement</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Pour exercer ces droits, contactez-nous à : <a href="mailto:dpo@lavcom.fr" className="text-primary hover:underline">dpo@lavcom.fr</a>
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">4.5 Cookies</h3>
            <p className="text-muted-foreground">
              Ce site utilise des cookies techniques nécessaires au fonctionnement du service, ainsi que des cookies analytiques (Google Analytics) pour mesurer l'audience. Vous pouvez configurer votre navigateur pour refuser les cookies.
            </p>
          </section>

          {/* CGV */}
          <section id="cgv" className="mb-8 scroll-mt-20">
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Conditions Générales de Vente (CGV)</h2>
            
            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.1 Objet</h3>
            <p className="text-muted-foreground">
              Les présentes CGV régissent les relations contractuelles entre LAVCOM SAS et tout utilisateur souscrivant à un abonnement au service Lavcom Performances.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.2 Services proposés</h3>
            <p className="text-muted-foreground">
              Lavcom Performances propose une plateforme de gestion et d'analyse de performances pour les exploitants de laveries automatiques, incluant :
            </p>
            <ul className="text-muted-foreground list-disc pl-5 mt-2 space-y-1">
              <li>Tableau de bord et indicateurs de performance (KPIs)</li>
              <li>Import et analyse des données d'exploitation</li>
              <li>Génération de rapports PDF</li>
              <li>Simulateur de création de laverie</li>
              <li>Recommandations et alertes</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.3 Tarifs et paiement</h3>
            <p className="text-muted-foreground">
              Les tarifs sont indiqués en euros TTC sur la page Tarifs. Le paiement s'effectue par carte bancaire. Les abonnements sont renouvelés automatiquement sauf résiliation.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.4 Période d'essai</h3>
            <p className="text-muted-foreground">
              Une période d'essai gratuite de 14 jours est proposée. Aucun moyen de paiement n'est requis pendant cette période.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.5 Résiliation</h3>
            <p className="text-muted-foreground">
              L'abonnement peut être résilié à tout moment depuis l'espace client. La résiliation prend effet à la fin de la période de facturation en cours.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.6 Responsabilité</h3>
            <p className="text-muted-foreground">
              LAVCOM SAS s'engage à fournir un service de qualité mais ne peut être tenue responsable des dommages indirects liés à l'utilisation du service. Les données saisies par l'utilisateur restent sous sa responsabilité.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Contact</h2>
            <p className="text-muted-foreground">
              Pour toute question concernant ces mentions légales, vous pouvez nous contacter :
            </p>
            <ul className="text-muted-foreground space-y-1 list-none pl-0 mt-2">
              <li><strong>Email :</strong> <a href="mailto:contact@lavcom.fr" className="text-primary hover:underline">contact@lavcom.fr</a></li>
              <li><strong>Téléphone :</strong> 01 23 45 67 89</li>
            </ul>
          </section>

          <p className="text-sm text-muted-foreground mt-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </main>

      <Footer />
    </div>
    </>
  );
}
