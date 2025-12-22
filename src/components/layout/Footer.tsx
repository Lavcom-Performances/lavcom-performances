import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, Phone, Linkedin, Instagram, Facebook } from "lucide-react";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";

export function Footer() {
  const { t } = useTranslation('common');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-block mb-4">
              <img 
                src={lavcomLogo} 
                alt="Lavcom Performances" 
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              {t('footer.description')}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t('footer.navigation')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('home')}
                </Link>
              </li>
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
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('login')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/mentions-legales" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.legalNotice')}
                </Link>
              </li>
              <li>
                <Link to="/mentions-legales#confidentialite" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link to="/mentions-legales#cgv" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.termsOfService')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <a 
                  href="mailto:contact@lavcom.fr" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  contact@lavcom.fr
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <a 
                  href="tel:+33123456789" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  01 23 45 67 89
                </a>
              </li>
            </ul>
            
            {/* Social Media */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-sm font-medium text-foreground mb-3">Suivez-nous</p>
              <div className="flex items-center gap-3">
                <a 
                  href="https://linkedin.com/company/lavcom" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
                <a 
                  href="https://instagram.com/lavcom" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a 
                  href="https://facebook.com/lavcom" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                  aria-label="Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            {t('footer.copyright', { year: currentYear })}
          </p>
          <div className="flex items-center gap-4">
            <a 
              href="https://lavcom.fr" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              lavcom.fr
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
