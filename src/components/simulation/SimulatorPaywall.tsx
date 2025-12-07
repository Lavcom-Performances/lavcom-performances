import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Video, Calculator, FileText, Lock } from "lucide-react";

interface SimulatorPaywallProps {
  onSubscribe?: (plan: 'simulator' | 'premium') => void;
}

export function SimulatorPaywall({ onSubscribe }: SimulatorPaywallProps) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">Accès réservé aux abonnés</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Simulateur de rentabilité
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Estimez la rentabilité de votre future laverie grâce à notre outil de simulation complet. 
            Testez différents scénarios et prenez des décisions éclairées.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pack Simulateur */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Pack Simulateur
              </CardTitle>
              <CardDescription>
                Accès complet au simulateur de rentabilité
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">79 €</span>
                <span className="text-muted-foreground">/ mois</span>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm">Simulateur de rentabilité illimité</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm">Configuration machines personnalisée</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm">Calcul du seuil de rentabilité</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm">Export PDF des rapports</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm">Projets illimités</span>
                </li>
              </ul>

              <Button 
                className="w-full" 
                size="lg"
                onClick={() => onSubscribe?.('simulator')}
              >
                Souscrire au Pack Simulateur
              </Button>
            </CardContent>
          </Card>

          {/* Pack Premium */}
          <Card className="relative border-primary">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                <Sparkles className="h-3 w-3 mr-1" />
                Recommandé
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Pack Premium
              </CardTitle>
              <CardDescription>
                Simulateur + accompagnement personnalisé
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">279 €</span>
                <span className="text-muted-foreground">unique</span>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">1 mois d'accès au simulateur inclus</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">1h de visio avec un expert</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm">Analyse personnalisée de votre projet</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm">Conseils sur le choix du local</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm">Recommandations équipements</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm">Compte-rendu écrit post-visio</span>
                </li>
              </ul>

              <Button 
                className="w-full" 
                size="lg"
                variant="default"
                onClick={() => onSubscribe?.('premium')}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Choisir le Pack Premium
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Vous avez déjà un abonnement ? <a href="/login" className="text-primary hover:underline">Connectez-vous</a>
          </p>
        </div>
      </div>
    </div>
  );
}
