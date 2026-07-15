import { SimulatorPageHeader } from "@/components/simulator/layout/SimulatorPageHeader";
import { SimulatorFooterNav } from "@/components/simulator/layout/SimulatorFooterNav";
import { PricingHintBanner } from "@/components/simulator/machines/PricingHintBanner";
import { WashersConfigCard } from "@/components/simulator/machines/WashersConfigCard";
import { DryersConfigCard } from "@/components/simulator/machines/DryersConfigCard";
import { MachineMixSummary } from "@/components/simulator/machines/MachineMixSummary";
import { useSimulatorProject } from "@/hooks/useSimulatorProject";

export default function SimulatorMachinesPage() {
  const { project, updateProject } = useSimulatorProject();

  return (
    <>
      <SimulatorPageHeader
        title="Configuration des machines"
        description="Configurez les machines et leur répartition dans votre local"
      />
      <div className="space-y-6">
        <PricingHintBanner>
          Configuration pré-remplie avec une laverie type – ajustez selon votre projet
        </PricingHintBanner>
        <WashersConfigCard project={project} onUpdate={updateProject} />
        <DryersConfigCard project={project} onUpdate={updateProject} />
        <MachineMixSummary project={project} />
      </div>
      <SimulatorFooterNav
        previousPath="/simulator/project"
        nextPath="/simulator/charges"
      />
    </>
  );
}
