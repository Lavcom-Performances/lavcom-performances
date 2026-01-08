import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";

export function Footer() {
  const { t } = useTranslation('common');

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
                className="h-12 md:h-14 w-auto"
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
            <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">{t('footer.contact')}</h4>
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
          </div>
        </div>

        {/* Footer discret - style minimaliste */}
        <div className="border-t border-border pt-6">
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
    </footer>
  );
}
