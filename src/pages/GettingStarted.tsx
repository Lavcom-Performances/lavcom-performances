import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Play, 
  Upload, 
  HelpCircle,
  ChevronRight,
  Lightbulb,
  FileText,
  Building2,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTutorial } from "@/hooks/useTutorial";
import { InteractiveTutorial } from "@/components/onboarding/InteractiveTutorial";
import { SEOHead } from "@/components/seo/SEOHead";

const FAQ_ITEMS = [
  {
    question: "Quel format de fichier CSV est accepté ?",
    answer: "Nous acceptons les fichiers CSV avec les colonnes : Date, Heure (optionnel), Machine, Montant et Mode de paiement. Les formats de date courants sont automatiquement détectés.",
  },
  {
    question: "Combien de laveries puis-je gérer ?",
    answer: "Vous pouvez gérer autant de laveries que nécessaire selon votre abonnement. Chaque site dispose de ses propres données et analyses.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Oui, toutes vos données sont chiffrées et stockées de manière sécurisée. Nous ne partageons jamais vos informations avec des tiers.",
  },
  {
    question: "Comment exporter mes rapports ?",
    answer: "Depuis le Tableau de bord, cliquez sur le bouton Exporter PDF pour générer un rapport complet de vos indicateurs.",
  },
  {
    question: "Puis-je importer plusieurs fichiers ?",
    answer: "Oui, vous pouvez importer autant de fichiers que nécessaire. Les doublons sont automatiquement détectés et ignorés.",
  },
];

const QUICK_LINKS = [
  {
    title: "Créer une laverie",
    description: "Ajoutez votre premier site",
    icon: Building2,
    href: "/laundromat-settings",
  },
  {
    title: "Importer des données",
    description: "Chargez vos fichiers CSV",
    icon: Upload,
    href: "/operations",
  },
  {
    title: "Voir le tableau de bord",
    description: "Consultez vos indicateurs",
    icon: BarChart3,
    href: "/dashboard",
  },
];

export default function GettingStarted() {
  const navigate = useNavigate();
  const tutorial = useTutorial();

  return (
    <>
      <SEOHead
        title="Démarrage rapide | Laverie Analytics"
        description="Guide de démarrage pour configurer votre tableau de bord et importer vos données"
      />

      <InteractiveTutorial
        isActive={tutorial.isActive}
        currentStep={tutorial.currentStep}
        onNext={tutorial.nextStep}
        onPrev={tutorial.prevStep}
        onSkip={tutorial.skipTutorial}
        onNeverShow={tutorial.neverShowAgain}
      />

      <div className="container max-w-4xl py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <Lightbulb className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Bienvenue sur Laverie Analytics
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Obtenez vos premiers indicateurs en quelques minutes. Suivez notre guide pour configurer votre espace.
          </p>
        </motion.div>

        {/* Video placeholder + Tutorial CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-primary/20 via-muted to-primary/10 flex items-center justify-center relative">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-background/80 backdrop-blur flex items-center justify-center mx-auto shadow-lg">
                  <Play className="h-8 w-8 text-primary ml-1" />
                </div>
                <p className="text-muted-foreground font-medium">
                  Vidéo de présentation à venir
                </p>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">
                    Découvrez l'application en 3 étapes
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Un tutoriel interactif pour bien démarrer
                  </p>
                </div>
                {tutorial.showStartButton && (
                  <Button onClick={tutorial.startTutorial} className="gap-2 shrink-0">
                    <Play className="h-4 w-4" />
                    Démarrer le tutoriel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-4 sm:grid-cols-3"
        >
          {QUICK_LINKS.map((link) => (
            <Card
              key={link.href}
              className="group cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(link.href)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <link.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {link.title}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {link.description}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Import CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="p-4 rounded-2xl bg-primary/10">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Prêt à importer vos données ?
                </h3>
                <p className="text-muted-foreground">
                  Chargez votre premier fichier CSV pour voir vos indicateurs
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => navigate("/operations")}
                className="gap-2 shrink-0"
              >
                <Upload className="h-4 w-4" />
                Importer mon CSV
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Questions fréquentes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Accordion type="single" collapsible className="w-full">
                {FAQ_ITEMS.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
