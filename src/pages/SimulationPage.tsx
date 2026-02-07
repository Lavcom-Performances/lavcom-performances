import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { SimulationStepper } from "@/components/simulation/SimulationStepper";
import { StepLocal } from "@/components/simulation/StepLocal";
import { StepProjectInfo } from "@/components/simulation/StepProjectInfo";
import { StepMachines } from "@/components/simulation/StepMachines";
import { StepCosts } from "@/components/simulation/StepCosts";
import { StepResults } from "@/components/simulation/StepResults";
import { SimulatorPaywall } from "@/components/simulation/SimulatorPaywall";
import { 
  SimulationProject, 
  defaultSimulationProject, 
  calculateSimulationResults 
} from "@/types/simulation";
import { SEOHead } from "@/components/seo/SEOHead";
import { UxClarityQuestion } from "@/components/ux-feedback/UxClarityQuestion";

const steps = [
  { id: 0, name: "Local", description: "Contraintes & configuration" },
  { id: 1, name: "Mon projet", description: "Informations générales" },
  { id: 2, name: "Machines", description: "Configuration & recettes" },
  { id: 3, name: "Charges", description: "Coûts & rentabilité" },
  { id: 4, name: "Résultats", description: "Synthèse" },
];

export default function SimulationPage() {
  // Pour le MVP, on gère l'accès via un état local
  // En production, cela viendrait de l'authentification/base de données
  const [hasSimulatorAccess] = useState(true); // Mettre à false pour tester le paywall
  
  const [currentStep, setCurrentStep] = useState(0); // Commence à l'étape 0
  const [project, setProject] = useState<SimulationProject>(defaultSimulationProject);

  // Calcul des résultats à chaque modification
  const results = useMemo(() => calculateSimulationResults(project), [project]);

  const updateProject = (updates: Partial<SimulationProject>) => {
    setProject(prev => ({ ...prev, ...updates }));
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step <= 4) {
      setCurrentStep(step);
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubscribe = (plan: 'simulator' | 'premium') => {
    // En production, rediriger vers le processus de paiement
    console.log(`Souscription au plan: ${plan}`);
    // Pour le MVP, on peut juste afficher un message ou rediriger
  };

  // Afficher le paywall si l'utilisateur n'a pas accès
  if (!hasSimulatorAccess) {
    return <SimulatorPaywall onSubscribe={handleSubscribe} />;
  }

  return (
    <>
      <SEOHead 
        title="Simulation de rentabilité"
        description="Simulez la rentabilité de votre projet de laverie automatique avec notre outil complet."
        url="/simulation"
        noindex={true}
      />
      <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" className="gap-2">
                <Home className="h-4 w-4" />
                Accueil
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Simulation de projet</h1>
          <p className="text-muted-foreground mt-1">
            Estimez la rentabilité de votre future laverie
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-12">
          <SimulationStepper 
            steps={steps} 
            currentStep={currentStep}
            onStepClick={goToStep}
          />
        </div>

        {/* Contenu de l'étape */}
        <div className="mb-8">
          {currentStep === 0 && (
            <StepLocal 
              project={project} 
              onUpdate={updateProject} 
            />
          )}
          {currentStep === 1 && (
            <StepProjectInfo 
              project={project} 
              onUpdate={updateProject} 
            />
          )}
          {currentStep === 2 && (
            <StepMachines 
              project={project} 
              results={results}
              onUpdate={updateProject} 
            />
          )}
          {currentStep === 3 && (
            <StepCosts 
              project={project} 
              results={results}
              onUpdate={updateProject} 
            />
          )}
          {currentStep === 4 && (
            <StepResults 
              project={project} 
              results={results}
              onEditStep={goToStep}
            />
          )}
        </div>

        {/* Navigation */}
        {currentStep < 4 && (
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour
            </Button>
            <Button
              onClick={handleNext}
              className="gap-2"
            >
              Continuer
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
    
    {/* UX Clarity Questionnaire */}
    <UxClarityQuestion enabled={true} />
    </>
  );
}
