import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  BarChart3, 
  TrendingUp, 
  Bell, 
  LineChart, 
  Shield, 
  Zap, 
  Clock, 
  PieChart,
  ArrowRight,
  CheckCircle2,
  Play,
  Quote,
  Star,
  Send,
  Mail,
  User,
  MessageSquare,
  Loader2,
  Calculator,
  Rocket
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import lavcomLogo from "@/assets/lavcom-logo-header.png";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100, "Le nom est trop long"),
  email: z.string().trim().email("Email invalide").max(255, "Email trop long"),
  message: z.string().trim().min(10, "Le message doit contenir au moins 10 caractères").max(1000, "Le message est trop long (max 1000 caractères)")
});

const features = [
  {
    icon: BarChart3,
    title: "Tableaux de bord en temps réel",
    description: "Visualisez vos performances avec des KPIs clairs et des graphiques interactifs."
  },
  {
    icon: TrendingUp,
    title: "Analyses prédictives",
    description: "Anticipez les tendances et optimisez votre chiffre d'affaires grâce à l'IA."
  },
  {
    icon: Bell,
    title: "Alertes intelligentes",
    description: "Soyez notifié instantanément des anomalies et des opportunités."
  },
  {
    icon: LineChart,
    title: "Suivi des revenus",
    description: "Analysez vos revenus par période, machine et mode de paiement."
  },
  {
    icon: Shield,
    title: "Maintenance prédictive",
    description: "Réduisez les pannes grâce aux recommandations de maintenance."
  },
  {
    icon: Zap,
    title: "Optimisation opérationnelle",
    description: "Identifiez les heures creuses et maximisez le taux d'occupation."
  }
];

const benefits = [
  "Augmentez votre chiffre d'affaires jusqu'à 25%",
  "Réduisez les temps d'arrêt machine de 40%",
  "Gagnez 10h/semaine sur la gestion administrative",
  "Accédez à vos données depuis n'importe où"
];

const testimonials = [
  {
    name: "Marie Dupont",
    role: "Gérante, Laverie Express Lyon",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    quote: "Grâce à Lavcom Analytics, j'ai pu identifier mes heures creuses et ajuster mes tarifs. Mon CA a augmenté de 30% en 6 mois !",
    rating: 5
  },
  {
    name: "Pierre Martin",
    role: "Propriétaire, Clean & Fresh Paris",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    quote: "Les alertes de maintenance m'ont permis d'éviter 3 pannes majeures ce trimestre. L'investissement est rentabilisé en quelques semaines.",
    rating: 5
  },
  {
    name: "Sophie Bernard",
    role: "Directrice, Réseau LavPlus",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    quote: "Avec 12 laveries, je ne pouvais plus tout gérer manuellement. Lavcom me donne une vue d'ensemble instantanée de tout mon réseau.",
    rating: 5
  }
];

const LandingPage = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactErrors, setContactErrors] = useState<{ name?: string; email?: string; message?: string }>({});

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactErrors({});

    const result = contactSchema.safeParse(contactForm);
    if (!result.success) {
      const errors: { name?: string; email?: string; message?: string } = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof typeof errors;
        errors[field] = err.message;
      });
      setContactErrors(errors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Remplacez YOUR_FORM_ID par votre ID Formspree (ex: xrgvknwl)
      const response = await fetch("https://formspree.io/f/YOUR_FORM_ID", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          message: contactForm.message,
        }),
      });

      if (response.ok) {
        toast({
          title: "Message envoyé !",
          description: "Nous vous répondrons dans les plus brefs délais.",
        });
        setContactForm({ name: "", email: "", message: "" });
      } else {
        throw new Error("Erreur lors de l'envoi");
      }
    } catch (error) {
      console.error("Formspree error:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={lavcomLogo} alt="Lavcom Analytics" className="h-8 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Fonctionnalités
            </a>
            <a href="#demo" className="text-muted-foreground hover:text-foreground transition-colors">
              Démo
            </a>
            <Link to="/simulation" className="text-amber-600 hover:text-amber-700 font-medium transition-colors">
              Simulateur
            </Link>
            <a href="#benefits" className="text-muted-foreground hover:text-foreground transition-colors">
              Avantages
            </a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
              Témoignages
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Tarifs
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="btn-bounce">
                Connexion
              </Button>
            </Link>
            <Link to="/pricing">
              <Button className="btn-bounce bg-primary hover:bg-primary/90">
                Essai gratuit
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
            <Zap className="h-4 w-4" />
            Solution n°1 pour les laveries automatiques
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in stagger-1 leading-tight">
            Vos centrales collectent les données,{" "}
            <span className="text-primary">Lavcom Analytics les transforme en décisions concrètes.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-fade-in stagger-2">
            Lavcom Analytics analyse les données de vos centrales de paiement et vous dit quoi faire pour augmenter la rentabilité de vos laveries.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in stagger-3">
            <Link to="/login">
              <Button size="lg" className="btn-bounce bg-primary hover:bg-primary/90 text-lg px-8">
                Commencer maintenant
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#demo">
              <Button size="lg" variant="outline" className="btn-bounce text-lg px-8">
                <Play className="mr-2 h-5 w-5" />
                Voir la démo
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Section Futurs Exploitants */}
      <section className="py-16 px-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-y border-amber-500/20">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Rocket className="h-4 w-4" />
                Vous souhaitez ouvrir une laverie ?
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Simulez la rentabilité de votre projet
              </h2>
              <p className="text-muted-foreground mb-6">
                Avant d'investir, testez différents scénarios : nombre de machines, tarifs, charges...
                Notre simulateur calcule votre seuil de rentabilité et votre bénéfice estimé.
              </p>
              <ul className="space-y-2 mb-6 text-left">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Configuration machines personnalisée</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Calcul du seuil de rentabilité</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Export PDF du bilan prévisionnel</span>
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link to="/simulation">
                  <Button size="lg" className="btn-bounce bg-amber-600 hover:bg-amber-700 text-white">
                    <Calculator className="mr-2 h-5 w-5" />
                    Accéder au simulateur
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button size="lg" variant="outline" className="btn-bounce border-amber-600/50 text-amber-700 dark:text-amber-400 hover:bg-amber-600/10">
                    Voir les offres
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Card className="p-6 bg-card/80 backdrop-blur border-amber-500/30 shadow-xl">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
                    <Calculator className="h-8 w-8 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">Simulateur</p>
                    <p className="text-sm text-muted-foreground">de rentabilité</p>
                  </div>
                  <div className="pt-4 border-t border-border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pack Simulateur</span>
                      <span className="font-semibold">79 €/mois</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pack Premium</span>
                      <span className="font-semibold text-amber-600">279 € (+ visio expert)</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Video Demo Section */}
      <section id="demo" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Découvrez Lavcom Analytics en action
            </h2>
            <p className="text-muted-foreground text-lg">
              Une interface intuitive pour piloter votre activité
            </p>
          </div>
          
          <Card className="relative overflow-hidden rounded-2xl shadow-2xl border-2 border-primary/20 aspect-video bg-gradient-to-br from-sidebar-background to-muted group hover:border-primary/40 transition-all duration-300">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300 cursor-pointer">
                  <Play className="h-10 w-10 text-primary ml-1" />
                </div>
                <p className="text-muted-foreground">
                  Cliquez pour lancer la vidéo de démonstration
                </p>
                <p className="text-sm text-muted-foreground/70 mt-2">
                  Durée : 2 minutes
                </p>
              </div>
            </div>
            {/* Placeholder for actual video - replace src with real video URL */}
            {/* <video 
              className="w-full h-full object-cover"
              controls
              poster="/video-thumbnail.jpg"
            >
              <source src="/demo-video.mp4" type="video/mp4" />
            </video> */}
          </Card>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { icon: BarChart3, label: "Dashboard temps réel" },
              { icon: PieChart, label: "Analyses détaillées" },
              { icon: Bell, label: "Alertes & notifications" },
              { icon: Clock, label: "Historique complet" }
            ].map((item, index) => (
              <div 
                key={item.label}
                className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border/50 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <item.icon className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Des outils puissants pour analyser et optimiser chaque aspect de votre laverie
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title}
                className="p-6 card-lavcom-hover animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-4 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Des résultats concrets pour votre activité
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Nos clients constatent des améliorations significatives dès les premiers mois d'utilisation.
              </p>
              
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li 
                    key={benefit}
                    className="flex items-start gap-3 animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-8">
                <Link to="/pricing">
                  <Button size="lg" className="btn-bounce bg-primary hover:bg-primary/90">
                    Découvrir nos offres
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "25%", label: "Augmentation CA moyen" },
                { value: "40%", label: "Réduction pannes" },
                { value: "10h", label: "Gagnées par semaine" },
                { value: "24/7", label: "Accès aux données" }
              ].map((stat, index) => (
                <Card 
                  key={stat.label}
                  className="p-6 text-center card-lavcom-hover animate-fade-in"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="text-4xl font-bold text-primary mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ils nous font confiance
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Découvrez les témoignages de gérants qui ont transformé leur activité avec Lavcom Analytics
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={testimonial.name}
                className="p-6 card-lavcom-hover relative animate-fade-in"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/20" />
                
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                
                <p className="text-foreground mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Questions fréquentes
            </h2>
            <p className="text-muted-foreground text-lg">
              Tout ce que vous devez savoir sur Lavcom Analytics
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                Comment Lavcom Analytics se connecte-t-il à mes machines ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Lavcom Analytics s'intègre facilement avec la plupart des systèmes de paiement et de gestion de laverie. 
                Notre équipe technique vous accompagne dans la configuration initiale qui prend généralement moins de 2 heures.
                Aucune modification matérielle n'est nécessaire.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                Mes données sont-elles sécurisées ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Absolument. Toutes vos données sont chiffrées et stockées sur des serveurs sécurisés en Europe. 
                Nous sommes conformes au RGPD et ne partageons jamais vos informations avec des tiers. 
                Vous restez propriétaire de vos données à 100%.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                Puis-je gérer plusieurs laveries avec un seul compte ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Oui ! Lavcom Analytics est conçu pour gérer aussi bien une seule laverie qu'un réseau complet. 
                Vous pouvez visualiser les performances de chaque établissement individuellement ou obtenir une vue consolidée de tout votre réseau.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                Quelle est la durée de l'essai gratuit ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Vous bénéficiez d'un essai gratuit de 14 jours avec accès à toutes les fonctionnalités. 
                Aucune carte bancaire n'est requise pour commencer. À la fin de l'essai, vous choisissez l'offre qui vous convient.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                Comment fonctionnent les alertes de maintenance ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Notre système analyse en continu les données de vos machines pour détecter les anomalies avant qu'elles ne causent des pannes. 
                Vous recevez des alertes par email ou SMS avec des recommandations d'action précises. 
                Cela vous permet d'intervenir de manière préventive et de réduire significativement les temps d'arrêt.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-6" className="bg-card rounded-xl border border-border/50 px-6">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                Quel support est inclus dans l'abonnement ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Tous nos abonnements incluent un support par email avec réponse sous 24h. 
                Les offres Pro et Business bénéficient d'un support prioritaire par téléphone et d'un accompagnement personnalisé 
                pour optimiser l'utilisation de la plateforme.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Une question ? Contactez-nous
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Notre équipe vous répond sous 24h pour vous accompagner dans votre projet.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Email</h3>
                    <p className="text-muted-foreground">contact@lavcom-analytics.fr</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Horaires</h3>
                    <p className="text-muted-foreground">Lun-Ven : 9h-18h</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Réponse rapide</h3>
                    <p className="text-muted-foreground">Nous répondons sous 24h ouvrées</p>
                  </div>
                </div>
              </div>
            </div>
            
            <Card className="p-6 md:p-8 card-lavcom">
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="contact-name" className="text-foreground font-medium">
                    Nom complet
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="contact-name"
                      placeholder="Jean Dupont"
                      value={contactForm.name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      className="pl-10"
                      maxLength={100}
                    />
                  </div>
                  {contactErrors.name && (
                    <p className="text-sm text-destructive">{contactErrors.name}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="text-foreground font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="jean.dupont@email.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-10"
                      maxLength={255}
                    />
                  </div>
                  {contactErrors.email && (
                    <p className="text-sm text-destructive">{contactErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact-message" className="text-foreground font-medium">
                    Message
                  </Label>
                  <Textarea
                    id="contact-message"
                    placeholder="Comment pouvons-nous vous aider ?"
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    rows={4}
                    maxLength={1000}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    {contactErrors.message && (
                      <p className="text-destructive">{contactErrors.message}</p>
                    )}
                    <span className="ml-auto">{contactForm.message.length}/1000</span>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full btn-bounce bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Envoyer le message
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-sidebar-background to-muted border-0">
            <h2 className="text-3xl md:text-4xl font-bold text-card-foreground mb-4">
              Prêt à optimiser votre laverie ?
            </h2>
            <p className="text-card-foreground/70 text-lg mb-8 max-w-xl mx-auto">
              Rejoignez les centaines de gérants qui font confiance à Lavcom Analytics pour développer leur activité.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login">
                <Button size="lg" className="btn-bounce bg-primary hover:bg-primary/90 text-lg px-8">
                  Démarrer gratuitement
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="btn-bounce text-lg px-8 border-card-foreground/30 text-card-foreground hover:bg-card-foreground/10">
                  Voir les tarifs
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={lavcomLogo} alt="Lavcom" className="h-8 w-auto" />
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Mentions légales</a>
            <a href="#" className="hover:text-foreground transition-colors">Confidentialité</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Lavcom Analytics. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
