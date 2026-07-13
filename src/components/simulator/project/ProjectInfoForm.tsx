import { useState } from "react";
import { TabSectionHeading } from "./TabSectionHeading";
import { ProjectDetailsCard } from "./ProjectDetailsCard";

/**
 * État géographique du projet du simulateur.
 * - country : code pays ISO majuscule (ex "FR", "BE").
 * - address / city / postalCode : remplis via AddressAutocomplete.
 * - departmentCode / departmentName / region : dérivés de l'adresse,
 *   non affichés, destinés à être persistés en base plus tard.
 */
export interface ProjectLocationState {
  country: string;
  address: string;
  city: string;
  postalCode: string;
  departmentCode: string;
  departmentName: string;
  region: string;
}

const initialProjectLocation: ProjectLocationState = {
  country: "FR",
  address: "",
  city: "",
  postalCode: "",
  departmentCode: "",
  departmentName: "",
  region: "",
};

export function ProjectInfoForm() {
  // Nommé `projectLocation` (et non `location`) pour éviter la collision avec
  // la variable `location` retournée par `useLocation()` de react-router.
  const [projectLocation, setProjectLocation] = useState<ProjectLocationState>(
    initialProjectLocation,
  );

  return (
    <div className="space-y-8">
      <TabSectionHeading
        title="Informations sur votre projet"
        description="Décrivez les caractéristiques principales de votre future laverie"
      />
      <ProjectDetailsCard
        projectLocation={projectLocation}
        onProjectLocationChange={setProjectLocation}
      />
    </div>
  );
}
