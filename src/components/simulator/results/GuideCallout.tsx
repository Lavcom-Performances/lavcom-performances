import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from 'lucide-react';
import { useTranslation } from "react-i18next";

export function GuideCallout() {
  const { t } = useTranslation("paid-simulator");
  return (
    <div className="flex justify-start px-12 gap-6 border-solid border border-primary/30 rounded-xl bg-white w-full h-fit">
      <div className="flex flex-col justify-center items-center bg-primary/20 px-6 py-6">
        <div className="rounded-xl w-full h-fit shadow-form">
          <img 
            src="/src/assets/ebook-avant-ouvrir.jpg" 
            alt={t("results.guide.imageAlt")}
            className="rounded-xl h-[300px]"
          />
        </div>
      </div>
      <div className="flex flex-col h-fit justify-start gap-y-4 items-start my-8">
        <Badge>{t("results.guide.badge")}</Badge>
        <h3 className="font-bold text-left w-full">
          {t("results.guide.title")}
        </h3>
        <p className="text-left text-md text-muted-foreground max-w-2xl">
          {t("results.guide.description")}
        </p>
        <div className="flex items-center justify-start w-full gap-3 mt-12">
          <Button 
            size="lg" 
            asChild
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link to="https://lavcom.fr/nos-ebooks-2/" target="_blank">
              <span className="font-medium text-md text-white">{t("results.guide.cta")}</span>
              <ArrowRight />
            </Link>
          </Button>
          <span className="inline text-left w-max text-sm text-muted-foreground">
            {t("results.guide.collection")}
          </span>
        </div>
      </div>
    </div>
  );
}
