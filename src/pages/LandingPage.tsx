import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Play
} from "lucide-react";
import lavcomLogo from "@/assets/lavcom-analytics-logo.png";

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

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={lavcomLogo} alt="Lavcom Analytics" className="h-10 w-auto" />
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Fonctionnalités
            </a>
            <a href="#demo" className="text-muted-foreground hover:text-foreground transition-colors">
              Démo
            </a>
            <a href="#benefits" className="text-muted-foreground hover:text-foreground transition-colors">
              Avantages
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
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 animate-fade-in stagger-1">
            Transformez vos données en{" "}
            <span className="text-primary">décisions rentables</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in stagger-2">
            Lavcom Analytics vous offre une vision complète de votre activité. 
            Analysez, anticipez et optimisez vos performances en temps réel.
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
