import { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  Wrench, 
  BarChart3, 
  Megaphone, 
  Shield, 
  ArrowRight, 
  Users,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ExpertType {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  benefits: string[];
  color: string;
  bgColor: string;
}

const EXPERT_TYPES: ExpertType[] = [
  {
    id: "installation",
    icon: Wrench,
    title: "Installation & Aménagement",
    description: "Optimisez l'agencement de votre laverie pour maximiser la rentabilité",
    benefits: [
      "Étude de flux clients",
      "Choix des équipements adaptés",
      "Agencement optimal des machines",
      "Conseils techniques"
    ],
    color: "text-blue-600",
    bgColor: "bg-blue-500/10"
  },
  {
    id: "gestion",
    icon: BarChart3,
    title: "Gestion d'entreprise",
    description: "Structurez et développez votre activité de laverie automatique",
    benefits: [
      "Business plan & prévisionnel",
      "Choix du statut juridique",
      "Comptabilité & fiscalité",
      "Stratégie de développement"
    ],
    color: "text-green-600",
    bgColor: "bg-green-500/10"
  },
  {
    id: "communication",
    icon: Megaphone,
    title: "Communication & Marketing",
    description: "Augmentez votre visibilité et attirez plus de clients",
    benefits: [
      "Identité visuelle",
      "Présence en ligne",
      "Campagnes locales",
      "Fidélisation clients"
    ],
    color: "text-purple-600",
    bgColor: "bg-purple-500/10"
  },
  {
    id: "assurance",
    icon: Shield,
    title: "Assurance & Protection",
    description: "Protégez votre investissement avec les bonnes garanties",
    benefits: [
      "RC professionnelle",
      "Assurance matériel",
      "Protection juridique",
      "Garantie perte d'exploitation"
    ],
    color: "text-amber-600",
    bgColor: "bg-amber-500/10"
  }
];

interface ExpertSectionProps {
  variant?: "landing" | "simulator";
  className?: string;
}

export function ExpertSection({ variant = "landing", className = "" }: ExpertSectionProps) {
  const { t } = useTranslation(['landing']);
  const [selectedExpert, setSelectedExpert] = useState<ExpertType | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });

  const handleExpertClick = (expert: ExpertType) => {
    setSelectedExpert(expert);
    setShowContactDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate submission - in production, this would call an API
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success("Demande envoyée !", {
      description: `Un expert ${selectedExpert?.title.toLowerCase()} vous contactera sous 48h.`
    });

    setShowContactDialog(false);
    setContactForm({ name: "", email: "", phone: "", message: "" });
    setIsSubmitting(false);
  };

  const isSimulator = variant === "simulator";

  return (
    <section className={`py-16 ${isSimulator ? 'bg-muted/30' : 'bg-gradient-to-b from-background to-muted/30'} ${className}`}>
      <div className={isSimulator ? "" : "container mx-auto px-4"}>
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 gap-2">
            <Users className="h-3.5 w-3.5" />
            Réseau d'experts partenaires
          </Badge>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Envie d'un regard expert ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {isSimulator 
              ? "Concrétisez votre projet avec l'accompagnement de professionnels spécialisés dans les laveries automatiques."
              : "Bénéficiez de l'expertise de professionnels pour lancer ou optimiser votre laverie automatique."
            }
          </p>
        </div>

        {/* Expert Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {EXPERT_TYPES.map((expert) => {
            const Icon = expert.icon;
            return (
              <Card 
                key={expert.id}
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-primary/30"
                onClick={() => handleExpertClick(expert)}
              >
                <CardHeader className="pb-3">
                  <div className={`w-12 h-12 rounded-xl ${expert.bgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${expert.color}`} />
                  </div>
                  <CardTitle className="text-lg">{expert.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {expert.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 mb-4">
                    {expert.benefits.slice(0, 3).map((benefit, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className={`h-3.5 w-3.5 ${expert.color} flex-shrink-0`} />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  <Button variant="ghost" size="sm" className="w-full group-hover:bg-primary/10">
                    Être mis en relation
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Vous êtes un expert et souhaitez rejoindre notre réseau ?
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href="mailto:partenaires@lavcom.fr">
              Devenir partenaire
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              {selectedExpert && (
                <div className={`w-10 h-10 rounded-lg ${selectedExpert.bgColor} flex items-center justify-center`}>
                  <selectedExpert.icon className={`h-5 w-5 ${selectedExpert.color}`} />
                </div>
              )}
              <div>
                <DialogTitle>Demande de mise en relation</DialogTitle>
                <DialogDescription>
                  {selectedExpert?.title}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expert-name">Nom *</Label>
                <Input
                  id="expert-name"
                  placeholder="Votre nom"
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expert-phone">Téléphone</Label>
                <Input
                  id="expert-phone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expert-email">Email *</Label>
              <Input
                id="expert-email"
                type="email"
                placeholder="votre@email.com"
                value={contactForm.email}
                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expert-message">Décrivez votre projet</Label>
              <Textarea
                id="expert-message"
                placeholder="Parlez-nous de votre projet de laverie..."
                value={contactForm.message}
                onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowContactDialog(false)} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Envoi..." : "Envoyer ma demande"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Un expert vous contactera sous 48h ouvrées.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
