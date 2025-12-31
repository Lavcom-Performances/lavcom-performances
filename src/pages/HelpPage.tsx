import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HelpCircle, Upload, CreditCard, FileDown, Send, Loader2, CheckCircle, Mail, MessageSquare, ChevronDown } from "lucide-react";
import { SupportChatbot } from "@/components/help/SupportChatbot";
import { z } from "zod";
import { SEOHead } from "@/components/seo/SEOHead";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSites } from "@/hooks/useSites";

export default function HelpPage() {
  const { t, i18n } = useTranslation("app");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { sites, getDefaultSite } = useSites();
  const contactFormRef = useRef<HTMLDivElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const defaultSite = getDefaultSite();
  
  const scrollToContactForm = () => {
    contactFormRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const [form, setForm] = useState({
    name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : "",
    email: user?.email || "",
    topic: "",
    message: "",
    siteName: defaultSite?.name || "",
  });

  const lang = i18n.language?.startsWith("en") ? "en" : "fr";

  const topics = lang === "fr" 
    ? [
        { value: "csv_import", label: "Import CSV" },
        { value: "data_dashboard", label: "Données / Tableaux de bord" },
        { value: "subscription", label: "Abonnement & Factures" },
        { value: "account", label: "Compte & Connexion" },
        { value: "other", label: "Autre" },
      ]
    : [
        { value: "csv_import", label: "CSV Import" },
        { value: "data_dashboard", label: "Data & Dashboards" },
        { value: "subscription", label: "Subscription & Invoices" },
        { value: "account", label: "Account & Login" },
        { value: "other", label: "Other" },
      ];

  const faq = lang === "fr"
    ? [
        { q: "Où importer mon CSV ?", a: "Rendez-vous sur la page Opérations, puis cliquez sur le bouton \"Importer\". Vous pouvez y déposer un ou plusieurs fichiers CSV." },
        { q: "Que signifie \"doublons ignorés\" ?", a: "Les doublons sont des lignes déjà présentes dans vos données. Elles sont automatiquement détectées et ignorées pour éviter les erreurs de comptage." },
        { q: "Pourquoi je ne vois pas mes données sur certaines pages ?", a: "Les pages comme Tableau de bord, Recommandations ou Rentabilité nécessitent un import CSV préalable. Importez vos données sur la page Opérations pour activer ces analyses." },
        { q: "CB vs ESP : quelle différence ?", a: "CB = paiement par carte bancaire. ESP = paiement en espèces (pièces/billets). Ces modes de paiement sont automatiquement détectés à l'import." },
        { q: "Les montants sont-ils en euros ?", a: "Oui, tous les montants affichés sont en euros (€). La conversion depuis les centimes est automatique si nécessaire." },
        { q: "Puis-je importer plusieurs CSV ?", a: "Oui, vous pouvez importer jusqu'à 5 fichiers CSV en une seule fois. Les données seront fusionnées automatiquement." },
        { q: "Comment mettre à jour mes données ?", a: "Importez simplement un nouveau fichier CSV contenant les nouvelles données. Les doublons seront ignorés, seules les nouvelles lignes seront ajoutées." },
        { q: "Que faire en cas d'erreur d'import ?", a: "Vérifiez que votre fichier est au bon format (CSV). Consultez le résumé d'import pour identifier les lignes en erreur. En cas de problème persistant, contactez-nous via le formulaire ci-dessous." },
      ]
    : [
        { q: "Where do I import my CSV?", a: "Go to the Operations page and click the \"Import\" button. You can drop one or multiple CSV files there." },
        { q: "What does \"duplicates ignored\" mean?", a: "Duplicates are rows already present in your data. They are automatically detected and skipped to prevent counting errors." },
        { q: "Why don't I see data on some pages?", a: "Pages like Dashboard, Recommendations, or Profitability require a CSV import first. Import your data on the Operations page to enable these analyses." },
        { q: "CB vs ESP: what's the difference?", a: "CB = card payments. ESP = cash payments (coins/bills). These payment modes are automatically detected during import." },
        { q: "Are amounts shown in euros?", a: "Yes, all displayed amounts are in euros (€). Conversion from cents is automatic when needed." },
        { q: "Can I import multiple CSV files?", a: "Yes, you can import up to 5 CSV files at once. Data will be merged automatically." },
        { q: "How do I update my data?", a: "Simply import a new CSV file with the new data. Duplicates will be ignored, only new rows will be added." },
        { q: "What should I do if import fails?", a: "Check that your file is in the correct format (CSV). Review the import summary to identify error rows. For persistent issues, contact us using the form below." },
      ];

  const quickStartCards = [
    {
      icon: Upload,
      title: lang === "fr" ? "Importer un CSV" : "Import a CSV",
      description: lang === "fr" 
        ? "Importez vos données en quelques secondes depuis la page Opérations."
        : "Import your data in seconds from the Operations page.",
      action: () => navigate("/operations"),
      buttonText: lang === "fr" ? "Aller aux Opérations" : "Go to Operations",
    },
    {
      icon: CreditCard,
      title: lang === "fr" ? "Comprendre CB vs ESP" : "Understanding CB vs ESP",
      description: lang === "fr"
        ? "CB = carte bancaire. ESP = espèces (monnaie/billets). Ces modes sont détectés automatiquement à l'import."
        : "CB = card payments. ESP = cash payments (coins/bills). These modes are detected automatically during import.",
      action: null,
      buttonText: null,
    },
    {
      icon: FileDown,
      title: lang === "fr" ? "Télécharger un rapport" : "Download a report",
      description: lang === "fr"
        ? "Exportez vos données en PDF depuis le Tableau de bord ou les pages Graphiques."
        : "Export your data as PDF from the Dashboard or Charts pages.",
      action: () => navigate("/dashboard"),
      buttonText: lang === "fr" ? "Voir le Tableau de bord" : "View Dashboard",
    },
  ];

  const contactSchema = z.object({
    name: z.string().min(2, lang === "fr" ? "Nom requis (2 caractères min)" : "Name required (2 chars min)"),
    email: z.string().email(lang === "fr" ? "Email invalide" : "Invalid email"),
    topic: z.string().min(1, lang === "fr" ? "Veuillez sélectionner une thématique" : "Please select a topic"),
    message: z.string().min(10, lang === "fr" ? "Message trop court (10 caractères min)" : "Message too short (10 chars min)").max(2000),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const topicLabel = topics.find(t => t.value === form.topic)?.label || form.topic;
      
      const { error } = await supabase.functions.invoke('send-contact', {
        body: {
          topic: `[Support] ${topicLabel}`,
          topicValue: form.topic,
          email: form.email,
          message: `${form.message}${form.siteName ? `\n\n---\nSite concerné: ${form.siteName}` : ""}`,
          name: form.name,
          language: lang,
        },
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: lang === "fr" ? "Message envoyé" : "Message sent",
        description: lang === "fr" 
          ? "Nous revenons vers vous au plus vite."
          : "We'll get back to you as soon as possible.",
      });
    } catch (error) {
      console.error("Support form error:", error);
      toast({
        title: lang === "fr" ? "Erreur" : "Error",
        description: lang === "fr" 
          ? "Une erreur est survenue. Veuillez réessayer."
          : "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead 
        title={lang === "fr" ? "Aide & Support | Lavcom Performances" : "Help & Support | Lavcom Performances"}
        description={lang === "fr" ? "Trouvez des réponses à vos questions ou contactez notre équipe." : "Find answers to your questions or contact our team."}
      />
      
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {lang === "fr" ? "Aide & Support" : "Help & Support"}
              </h1>
              <p className="text-muted-foreground">
                {lang === "fr" 
                  ? "Trouvez une réponse rapidement ou contactez-nous."
                  : "Find an answer quickly or contact us."}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <section>
          <h2 className="text-lg font-semibold mb-4">
            {lang === "fr" ? "Démarrage rapide" : "Quick Start"}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {quickStartCards.map((card, i) => (
              <Card key={i} className="card-lavcom">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-lavcom-green/10 flex items-center justify-center">
                      <card.icon className="h-4 w-4 text-lavcom-green" />
                    </div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                  {card.action && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={card.action}
                      className="w-full"
                    >
                      {card.buttonText}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-lg font-semibold mb-4">
            {lang === "fr" ? "Questions fréquentes" : "Frequently Asked Questions"}
          </h2>
          <Card className="card-lavcom">
            <CardContent className="pt-4">
              <Accordion type="single" collapsible className="w-full">
                {faq.map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left text-sm hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>

        {/* Contact Form */}
        <section ref={contactFormRef} id="contact-form">
          <h2 className="text-lg font-semibold mb-4">
            {lang === "fr" ? "Contacter le support" : "Contact Support"}
          </h2>
          <Card className="card-lavcom">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                {lang === "fr" ? "Envoyer un message" : "Send a message"}
              </CardTitle>
              <CardDescription>
                {lang === "fr" 
                  ? "Notre équipe vous répond généralement sous 24h."
                  : "Our team usually responds within 24 hours."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-lavcom-green/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-lavcom-green" />
                  </div>
                  <p className="font-medium">
                    {lang === "fr" ? "Message envoyé !" : "Message sent!"}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {lang === "fr" 
                      ? "Nous revenons vers vous au plus vite. Merci pour votre patience."
                      : "We'll get back to you as soon as possible. Thank you for your patience."}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSubmitted(false);
                      setForm(prev => ({ ...prev, topic: "", message: "" }));
                    }}
                    className="mt-4"
                  >
                    {lang === "fr" ? "Envoyer un autre message" : "Send another message"}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="help-name">
                        {lang === "fr" ? "Nom" : "Name"} *
                      </Label>
                      <Input
                        id="help-name"
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={lang === "fr" ? "Votre nom" : "Your name"}
                        maxLength={100}
                      />
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="help-email">Email *</Label>
                      <Input
                        id="help-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@example.com"
                        maxLength={255}
                      />
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="help-topic">
                        {lang === "fr" ? "Thématique" : "Topic"} *
                      </Label>
                      <Select
                        value={form.topic}
                        onValueChange={(value) => setForm(prev => ({ ...prev, topic: value }))}
                      >
                        <SelectTrigger id="help-topic">
                          <SelectValue placeholder={lang === "fr" ? "Sélectionner..." : "Select..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {topics.map((topic) => (
                            <SelectItem key={topic.value} value={topic.value}>
                              {topic.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.topic && <p className="text-xs text-destructive">{errors.topic}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="help-site">
                        {lang === "fr" ? "Site concerné (optionnel)" : "Related site (optional)"}
                      </Label>
                      <Select
                        value={form.siteName}
                        onValueChange={(value) => setForm(prev => ({ ...prev, siteName: value }))}
                      >
                        <SelectTrigger id="help-site">
                          <SelectValue placeholder={lang === "fr" ? "Aucun" : "None"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">
                            {lang === "fr" ? "Aucun" : "None"}
                          </SelectItem>
                          {sites.map((site) => (
                            <SelectItem key={site.id} value={site.name}>
                              {site.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="help-message">Message *</Label>
                    <Textarea
                      id="help-message"
                      value={form.message}
                      onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder={lang === "fr" ? "Décrivez votre demande..." : "Describe your request..."}
                      rows={5}
                      maxLength={2000}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      {errors.message && <p className="text-destructive">{errors.message}</p>}
                      <span className="ml-auto">{form.message.length}/2000</span>
                    </div>
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {lang === "fr" ? "Envoi..." : "Sending..."}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {lang === "fr" ? "Envoyer" : "Send"}
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
      
      <SupportChatbot language={lang as "fr" | "en"} onScrollToContact={scrollToContactForm} />
    </>
  );
}
