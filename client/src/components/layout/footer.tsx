import { Link } from "wouter";
import { MapPin, Phone, Mail } from "lucide-react";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import leflowLogo from "@/assets/leflow-logo.png";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: "Početna", href: "/" },
    { name: "Pravila i Uslovi", href: "/pravila" },
    { name: "Kontakt", href: "/kontakt" }
  ];

  const scrollToServices = () => {
    const element = document.getElementById("usluge");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.href = "/#usluge";
    }
  };

  const services = [
    "Snimanje vokala",
    "Mix i Master",
    "Instrumentali",
    "Video produkcija"
  ];

  return (
    <footer className="bg-muted/30 border-t">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <FadeInWhenVisible delay={0.1}>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src={leflowLogo} 
                  alt="Studio LeFlow Logo" 
                  className="h-8 w-auto dark:invert transition-all"
                />
                <span className="text-xl font-bold font-[Montserrat]">Studio LeFlow</span>
              </div>
            <p className="text-sm text-muted-foreground mb-4">
              Profesionalni muzički studio u Beogradu za sve vaše kreativne potrebe.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Beograd, Srbija</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <a href="tel:+381XXXXXXXXX" className="hover:text-primary transition-colors">
                  +381 XX XXX XXXX
                </a>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <a href="mailto:info@studioleflow.rs" className="hover:text-primary transition-colors">
                  info@studioleflow.rs
                </a>
              </div>
            </div>
            </div>
          </FadeInWhenVisible>

          <FadeInWhenVisible delay={0.2}>
            <div>
              <h3 className="font-bold mb-4" data-testid="text-footer-links-title">Brzi Linkovi</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors" 
                    data-testid={`link-footer-${link.name.toLowerCase()}`}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={scrollToServices}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors text-left"
                  data-testid="link-footer-usluge"
                >
                  Usluge
                </button>
              </li>
            </ul>
            </div>
          </FadeInWhenVisible>

          <FadeInWhenVisible delay={0.3}>
            <div>
              <h3 className="font-bold mb-4" data-testid="text-footer-services-title">Usluge</h3>
            <ul className="space-y-2">
              {services.map((service) => (
                <li key={service}>
                  <span className="text-sm text-muted-foreground">{service}</span>
                </li>
              ))}
            </ul>
            </div>
          </FadeInWhenVisible>

          <FadeInWhenVisible delay={0.4}>
            <div>
              <h3 className="font-bold mb-4" data-testid="text-footer-hours-title">Radno Vreme</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Ponedeljak - Nedelja</p>
              <p className="font-semibold text-foreground">10:00 - 22:00</p>
              <p className="mt-4 text-xs">
                Termini se zakazuju unapred. Pozovite nas ili pošaljite upit putem kontakt forme.
              </p>
            </div>
            </div>
          </FadeInWhenVisible>
        </div>

        <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © {currentYear} Studio LeFlow. Sva prava zadržana.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link 
              href="/pravila"
              className="hover:text-primary transition-colors" 
              data-testid="link-footer-privacy"
            >
              Politika Privatnosti
            </Link>
            <Link 
              href="/pravila"
              className="hover:text-primary transition-colors" 
              data-testid="link-footer-terms"
            >
              Uslovi Korišćenja
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
