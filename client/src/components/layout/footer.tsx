import { Link } from "wouter";
import { MapPin, Phone, Mail, Instagram, BadgeCheck, ArrowRight } from "lucide-react";
import { NewsletterForm } from "@/components/newsletter-form";
import { Button } from "@/components/ui/button";
import leflowLogo from "@/assets/leflow-logo.png";

const links = [
  { label: "Početna", href: "/" },
  { label: "Giveaway", href: "/giveaway" },
  { label: "Zajednica", href: "/zajednica" },
  { label: "Projekti", href: "/projekti" },
  { label: "Tim", href: "/tim" },
  { label: "Česta Pitanja", href: "/faq" },
  { label: "Pravila i Uslovi", href: "/pravila" },
  { label: "Kontakt", href: "/kontakt" },
];

const contact = [
  { icon: Phone, label: "+381 63 734 7023", href: "tel:+381637347023" },
  { icon: Mail, label: "podrska@studioleflow.com", href: "mailto:podrska@studioleflow.com" },
  { icon: Instagram, label: "@studioleflow", href: "https://instagram.com/studioleflow", external: true },
  { icon: MapPin, label: "Beograd, Srbija", href: null },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-8">

        {/* Top CTA strip */}
        <div className="border border-border/60 rounded-xl px-6 py-5 mb-14 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Spremni za sledeću produkciju?</p>
            <p className="text-xs text-muted-foreground">Besplatna konsultacija — odgovaramo u roku od 24h</p>
          </div>
          <Link href="/kontakt">
            <Button size="sm" className="gap-2 flex-shrink-0" data-testid="button-footer-cta">
              Zakažite Termin <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16 mb-14">

          {/* Brand col */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src={leflowLogo}
                alt="Studio LeFlow"
                draggable={false}
                onContextMenu={e => e.preventDefault()}
                className="h-9 w-auto dark:invert select-none"
              />
              <span className="text-lg font-bold font-[Montserrat]">Studio LeFlow</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
              Profesionalni muzički studio u Beogradu. Snimanje, mix/mastering, instrumentali i video produkcija od 2019.
            </p>
            <div className="space-y-2.5">
              {contact.map(({ icon: Icon, label, href, external }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  {href ? (
                    <a
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {label}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">{label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Links col */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4" data-testid="text-footer-links-title">Stranice</p>
            <ul className="space-y-2.5">
              {links.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`link-footer-${label.toLowerCase()}`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter col */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Newsletter</p>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Novi projekti, ekskluzivne ponude i promocije — direktno u vaš inbox.
            </p>
            <NewsletterForm variant="footer" />
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {currentYear} Studio LeFlow. Sva prava zadržana.
          </p>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link href="/proveri" className="hover:text-primary transition-colors flex items-center gap-1" data-testid="link-footer-verify">
              <BadgeCheck className="w-3 h-3" /> Proveri Licencu
            </Link>
            <Link href="/pravila" className="hover:text-primary transition-colors" data-testid="link-footer-privacy">Pravila i Uslovi</Link>
            <Link href="/uslovi-koriscenja" className="hover:text-primary transition-colors" data-testid="link-footer-terms">Uslovi Korišćenja</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
