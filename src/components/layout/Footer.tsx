import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, Linkedin, Instagram, Facebook } from "lucide-react";
import lavcomLogo from "@/assets/lavcom-performances-header.png";
import { BetaFeedbackButton } from "@/components/feedback/BetaFeedbackButton";
import { useIsBetaCompany } from "@/hooks/useIsBetaCompany";

export function Footer() {
  const { t } = useTranslation('common');
  const { isBeta } = useIsBetaCompany();

  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 mb-10">
          {/* Logo & Description - takes more space */}
          <div className="md:col-span-5 lg:col-span-4">
            <Link to="/" className="inline-block mb-5">
              <img 
                src={lavcomLogo} 
                alt="Lavcom Performances" 
                className="h-8 w-auto"
              />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              {t('footer.description')}
            </p>
          </div>

          {/* Spacer for better distribution */}
          <div className="hidden lg:block lg:col-span-2" />

          {/* Liens rapides */}
          <div className="md:col-span-4 lg:col-span-3">
            <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">{t('footer.quickLinks')}</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.operatorsPricing')}
                </Link>
              </li>
              <li>
                <Link to="/simulateur" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.simulator')}
                </Link>
              </li>
              <li>
                <Link to="/subscribe-simulator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.simulatorPacks')}
                </Link>
              </li>
              <li>
                <Link to="/#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('faq')}
                </Link>
              </li>
              <li>
                <Link to="/#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-3 lg:col-span-3">
            <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <a 
                  href="mailto:contact@lavcom.fr" 
                  className="hover:text-foreground transition-colors"
                >
                  contact@lavcom.fr
                </a>
              </li>
            </ul>
            {/* Social Media Icons */}
            <div className="flex items-center gap-4 mt-4">
              <a 
                href="https://www.linkedin.com/company/lavcom/?viewAsMember=true" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a 
                href="https://www.instagram.com/lavcom_pourvotrelaverie" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="https://www.facebook.com/LavComFR" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
            {/* Website Link */}
            <a 
              href="https://www.lavcom.fr" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-3 inline-block"
            >
              www.lavcom.fr
            </a>
          </div>
        </div>

        {/* Footer discret - style minimaliste */}
        <div className="border-t border-border pt-6">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {isBeta && (
              <BetaFeedbackButton 
                variant="ghost" 
                className="text-muted-foreground hover:text-foreground text-xs" 
              />
            )}
            <p className="text-[11px] text-muted-foreground/70 text-center">
              © 2026 Lavcom. {t('footer.allRightsReserved')}{" "}
              <Link to="/mentions-legales" className="hover:text-foreground/80 transition-colors underline-offset-2 hover:underline">
                {t('footer.legalNotice')}
              </Link>
              {"   "}
              <Link to="/politique-confidentialite" className="hover:text-foreground/80 transition-colors underline-offset-2 hover:underline">
                {t('footer.privacyPolicy')}
              </Link>
              {"   "}
              <Link to="/cgv" className="hover:text-foreground/80 transition-colors underline-offset-2 hover:underline">
                {t('footer.termsOfService')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
