import { Link } from "react-router-dom";
import { Home, FileText, Shield, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import lavcomLogo from "@/assets/lavcom-performances-header.png";
import { SEOHead } from "@/components/seo/SEOHead";

const LAST_UPDATE = "22 décembre 2024";

export default function MentionsLegales() {
  return (
    <>
      <SEOHead 
        title="Mentions légales"
        description="Mentions légales de Lavcom Performances - Informations sur l'éditeur My'Po SARL, l'hébergement et la propriété intellectuelle."
        url="/mentions-legales"
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
          <div className="max-w-3xl mx-auto">
            {/* Title */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Scale className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                    Mentions légales
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Dernière mise à jour : {LAST_UPDATE}
                  </p>
                </div>
              </div>
            </div>

            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
              {/* Éditeur */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">Éditeur</h2>
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <ul className="text-muted-foreground space-y-2 list-none pl-0">
                    <li><strong>Raison sociale :</strong> My'Po SARL</li>
                    <li><strong>SIRET :</strong> 852 567 742 00022</li>
                    <li><strong>Adresse :</strong> 88 avenue de Grammont, 37000 Tours, France</li>
                    <li>
                      <strong>Contact :</strong>{" "}
                      <a href="mailto:contact@lavcom.fr" className="text-primary hover:underline">
                        contact@lavcom.fr
                      </a>
                    </li>
                  </ul>
                </div>
              </section>

              {/* Marque */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">Marque</h2>
                <p className="text-muted-foreground">
                  <strong>Lavcom Performances</strong> est une marque commerciale exploitée par My'Po SARL.
                </p>
              </section>

              {/* Hébergement */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">Hébergement</h2>
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <ul className="text-muted-foreground space-y-2 list-none pl-0">
                    <li><strong>Application :</strong> Lovable Cloud</li>
                    <li><strong>Données / Auth :</strong> Supabase</li>
                  </ul>
                </div>
              </section>

              {/* Propriété intellectuelle */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">Propriété intellectuelle</h2>
                <p className="text-muted-foreground">
                  L'ensemble des contenus et éléments du site (textes, visuels, marques, logiciels) 
                  est protégé par le droit d'auteur et la propriété intellectuelle. 
                  Toute reproduction sans autorisation préalable et écrite de My'Po SARL est interdite.
                </p>
              </section>

              {/* Responsabilité */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">Responsabilité</h2>
                <p className="text-muted-foreground">
                  Les informations et résultats fournis par la plateforme sont indicatifs et 
                  dépendent des données renseignées par l'utilisateur. L'éditeur ne garantit 
                  pas un résultat économique particulier.
                </p>
              </section>

              {/* Droit applicable */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">Droit applicable</h2>
                <p className="text-muted-foreground">
                  Les présentes mentions légales sont soumises au droit français. 
                  En cas de litige, les tribunaux français seront seuls compétents.
                </p>
              </section>

              {/* Liens vers autres pages légales */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">Documents complémentaires</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Link 
                    to="/cgv" 
                    className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        CGV / CGU
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Conditions générales de vente et d'utilisation
                      </p>
                    </div>
                  </Link>
                  <Link 
                    to="/politique-confidentialite" 
                    className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        Politique de confidentialité
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Protection des données personnelles (RGPD)
                      </p>
                    </div>
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
