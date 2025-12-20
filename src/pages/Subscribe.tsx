import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Building2, User, CreditCard, Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { getLaundromatPricing } from "@/config/pricingConfig";
import { Footer } from "@/components/layout/Footer";
import lavcomLogo from "@/assets/lavcom-performances-header.png";

interface CompanyInfo {
  raisonSociale: string;
  siret: string;
  adresse: string;
  codePostal: string;
  ville: string;
}

interface ContactInfo {
  civilite: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  fonction: string;
}

export default function Subscribe() {
  const { t } = useTranslation(['app', 'common']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planFromUrl = searchParams.get("plan") || "monthly";
  const countFromUrl = parseInt(searchParams.get("count") || "1", 10);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(planFromUrl);
  const [laundryCount, setLaundryCount] = useState(countFromUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    raisonSociale: "",
    siret: "",
    adresse: "",
    codePostal: "",
    ville: "",
  });
  
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    civilite: "M",
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    fonction: "",
  });

  const steps = [
    { id: 1, name: t('app:subscribe.steps.company'), icon: Building2 },
    { id: 2, name: t('app:subscribe.steps.contact'), icon: User },
    { id: 3, name: t('app:subscribe.steps.payment'), icon: CreditCard },
  ];

  const pricing = getLaundromatPricing(laundryCount);
  const currentPricing = selectedPlan === "annual" 
    ? { total: pricing.annualTotal, period: t('app:subscribe.payment.perYear'), perLav: pricing.annualPricePerLav }
    : { total: pricing.monthlyTotal, period: t('app:subscribe.payment.perMonth'), perLav: pricing.monthlyPricePerLav };

  const incrementCount = () => setLaundryCount(prev => Math.min(prev + 1, 100));
  const decrementCount = () => setLaundryCount(prev => Math.max(prev - 1, 1));

  const handleCountChange = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || value === "") {
      setLaundryCount(1);
    } else {
      setLaundryCount(Math.min(Math.max(num, 1), 100));
    }
  };

  const validateStep1 = () => {
    if (!companyInfo.raisonSociale || !companyInfo.siret || !companyInfo.adresse || !companyInfo.codePostal || !companyInfo.ville) {
      toast({
        title: t('app:subscribe.validation.incompleteTitle'),
        description: t('app:subscribe.validation.incompleteDesc'),
        variant: "destructive",
      });
      return false;
    }
    if (companyInfo.siret.replace(/\s/g, "").length !== 14) {
      toast({
        title: t('app:subscribe.validation.invalidSiretTitle'),
        description: t('app:subscribe.validation.invalidSiretDesc'),
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!contactInfo.nom || !contactInfo.prenom || !contactInfo.email || !contactInfo.telephone) {
      toast({
        title: t('app:subscribe.validation.incompleteTitle'),
        description: t('app:subscribe.validation.incompleteDesc'),
        variant: "destructive",
      });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactInfo.email)) {
      toast({
        title: t('app:subscribe.validation.invalidEmailTitle'),
        description: t('app:subscribe.validation.invalidEmailDesc'),
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Simulation du paiement
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    toast({
      title: t('app:subscribe.success.title'),
      description: t('app:subscribe.success.description'),
    });
    
    navigate("/select-laundromat");
  };

  const formatSiret = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/pricing" className="flex items-center gap-3">
            <img src={lavcomLogo} alt="Lavcom Analytics" className="h-10 w-auto" />
          </Link>
          <Link to="/pricing">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('app:subscribe.backToPricing')}
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Progress steps */}
          <nav className="mb-8">
            <ol className="flex items-center justify-center gap-2 sm:gap-4">
              {steps.map((step, index) => (
                <li key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${
                    currentStep >= step.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    <step.icon className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm font-medium">{step.name}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 sm:w-12 h-0.5 mx-2 ${
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    }`} />
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* Step 1: Company Info */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl sm:text-2xl flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  {t('app:subscribe.company.title')}
                </CardTitle>
                <CardDescription>
                  {t('app:subscribe.company.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="raisonSociale">{t('app:subscribe.company.companyName')} *</Label>
                  <Input
                    id="raisonSociale"
                    placeholder={t('app:subscribe.company.companyNamePlaceholder')}
                    value={companyInfo.raisonSociale}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, raisonSociale: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="siret">{t('app:subscribe.company.siret')} *</Label>
                  <Input
                    id="siret"
                    placeholder={t('app:subscribe.company.siretPlaceholder')}
                    value={companyInfo.siret}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, siret: formatSiret(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">{t('app:subscribe.company.siretHint')}</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="adresse">{t('app:subscribe.company.address')} *</Label>
                  <Input
                    id="adresse"
                    placeholder={t('app:subscribe.company.addressPlaceholder')}
                    value={companyInfo.adresse}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, adresse: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codePostal">{t('app:subscribe.company.postalCode')} *</Label>
                    <Input
                      id="codePostal"
                      placeholder={t('app:subscribe.company.postalCodePlaceholder')}
                      value={companyInfo.codePostal}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, codePostal: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ville">{t('app:subscribe.company.city')} *</Label>
                    <Input
                      id="ville"
                      placeholder={t('app:subscribe.company.cityPlaceholder')}
                      value={companyInfo.ville}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, ville: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Contact Info */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl sm:text-2xl flex items-center gap-2">
                  <User className="h-6 w-6 text-primary" />
                  {t('app:subscribe.contact.title')}
                </CardTitle>
                <CardDescription>
                  {t('app:subscribe.contact.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('app:subscribe.contact.civility')} *</Label>
                  <RadioGroup
                    value={contactInfo.civilite}
                    onValueChange={(value) => setContactInfo({ ...contactInfo, civilite: value })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="M" id="m" />
                      <Label htmlFor="m" className="font-normal">{t('app:subscribe.contact.mr')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Mme" id="mme" />
                      <Label htmlFor="mme" className="font-normal">{t('app:subscribe.contact.mrs')}</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">{t('app:subscribe.contact.firstName')} *</Label>
                    <Input
                      id="prenom"
                      placeholder={t('app:subscribe.contact.firstNamePlaceholder')}
                      value={contactInfo.prenom}
                      onChange={(e) => setContactInfo({ ...contactInfo, prenom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">{t('app:subscribe.contact.lastName')} *</Label>
                    <Input
                      id="nom"
                      placeholder={t('app:subscribe.contact.lastNamePlaceholder')}
                      value={contactInfo.nom}
                      onChange={(e) => setContactInfo({ ...contactInfo, nom: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fonction">{t('app:subscribe.contact.function')}</Label>
                  <Input
                    id="fonction"
                    placeholder={t('app:subscribe.contact.functionPlaceholder')}
                    value={contactInfo.fonction}
                    onChange={(e) => setContactInfo({ ...contactInfo, fonction: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">{t('app:subscribe.contact.email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('app:subscribe.contact.emailPlaceholder')}
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="telephone">{t('app:subscribe.contact.phone')} *</Label>
                  <Input
                    id="telephone"
                    type="tel"
                    placeholder={t('app:subscribe.contact.phonePlaceholder')}
                    value={contactInfo.telephone}
                    onChange={(e) => setContactInfo({ ...contactInfo, telephone: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Payment */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl sm:text-2xl flex items-center gap-2">
                  <CreditCard className="h-6 w-6 text-primary" />
                  {t('app:subscribe.payment.title')}
                </CardTitle>
                <CardDescription>
                  {t('app:subscribe.payment.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Laundry count */}
                <div className="space-y-3">
                  <Label>{t('app:subscribe.payment.laundryCount')}</Label>
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={decrementCount}
                      disabled={laundryCount <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={laundryCount}
                      onChange={(e) => handleCountChange(e.target.value)}
                      className="w-20 text-center text-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={incrementCount}
                      disabled={laundryCount >= 100}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 text-right">
                      <Badge variant="outline" className="text-muted-foreground">
                        {pricing.tierLabel}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Plan selection */}
                <div className="space-y-3">
                  <Label>{t('app:subscribe.payment.chosenPlan')}</Label>
                  <RadioGroup
                    value={selectedPlan}
                    onValueChange={setSelectedPlan}
                    className="grid gap-3"
                  >
                    <label 
                      htmlFor="monthly-plan"
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPlan === "monthly" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="monthly" id="monthly-plan" />
                        <div>
                          <p className="font-medium">{t('app:subscribe.payment.monthly')}</p>
                          <p className="text-sm text-muted-foreground">{t('app:subscribe.payment.noCommitment')}</p>
                        </div>
                      </div>
                      <p className="font-bold text-lg">{pricing.monthlyTotal}€/{t('app:subscribe.payment.perMonth')}</p>
                    </label>
                    
                    <label 
                      htmlFor="annual-plan"
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPlan === "annual" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="annual" id="annual-plan" />
                        <div>
                          <p className="font-medium">{t('app:subscribe.payment.annual')}</p>
                          <p className="text-sm text-primary">{t('app:subscribe.payment.monthsFree')}</p>
                        </div>
                      </div>
                      <p className="font-bold text-lg">{pricing.annualTotal}€/{t('app:subscribe.payment.perYear')}</p>
                    </label>
                  </RadioGroup>
                </div>

                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold">{t('app:subscribe.payment.summary')}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('app:subscribe.payment.companyLabel')}</span>
                      <span className="font-medium">{companyInfo.raisonSociale}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('app:subscribe.payment.contactLabel')}</span>
                      <span className="font-medium">{contactInfo.prenom} {contactInfo.nom}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('app:subscribe.payment.laundryCountLabel')}</span>
                      <span className="font-medium">{laundryCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('app:subscribe.payment.pricePerLaundry')}</span>
                      <span className="font-medium">{currentPricing.perLav}€/{currentPricing.period}</span>
                    </div>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{t('app:subscribe.payment.total')}</span>
                      <span className="text-2xl font-bold text-primary">
                        {currentPricing.total}€/{currentPricing.period}
                      </span>
                    </div>
                    {selectedPlan === "annual" && (
                      <p className="text-sm text-primary text-right">
                        {t('app:subscribe.payment.savings', { amount: pricing.annualSaving })}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('app:subscribe.navigation.previous')}
            </Button>
            
            {currentStep < 3 ? (
              <Button onClick={handleNext}>
                {t('app:subscribe.navigation.next')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? t('app:subscribe.navigation.processing') : t('app:subscribe.navigation.proceedPayment')}
                <CreditCard className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
