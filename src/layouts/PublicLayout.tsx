import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Layers, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Priser", href: "/priser" },
  { label: "Bransjer", href: "/bransjer" },
  { label: "Om oss", href: "/om-oss" },
  { label: "Kontakt", href: "/kontakt" },
];

function FinalCta() {
  return (
    <section className="py-20 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-t border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
          Klar til å effektivisere hverdagen?
        </h2>
        <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
          Bli med servicebedrifter som allerede bruker FieldService. Start gratis i dag — ingen kredittkort, ingen binding.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="gap-2 h-12 px-8 text-base">
            <Link to="/register">Start gratis demo <ArrowRight className="w-4 h-4" /></Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
            <Link to="/kontakt">Ta kontakt med oss</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-5">14 dager gratis · Ingen kredittkort · Data beholdes ved oppgradering</p>
      </div>
    </section>
  );
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Layers className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-base">FieldService</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  location.pathname.startsWith(l.href)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Logg inn</Link>
            </Button>
            <Button size="sm" asChild className="gap-1.5">
              <Link to="/register"><ArrowRight className="w-3.5 h-3.5" />Start gratis</Link>
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 pb-4 pt-2 space-y-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Button variant="outline" asChild className="w-full">
                <Link to="/login" onClick={() => setMobileOpen(false)}>Logg inn</Link>
              </Button>
              <Button asChild className="w-full gap-2">
                <Link to="/register" onClick={() => setMobileOpen(false)}>
                  <ArrowRight className="w-4 h-4" />Start gratis demo
                </Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      {/* Final CTA section above footer */}
      <FinalCta />

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm">FieldService</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Moderne feltservice-system for norske servicebedrifter.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Produkt</p>
            <ul className="space-y-2">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <Link to={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Kom i gang</p>
            <ul className="space-y-2">
              <li>
                <Link to="/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Start gratis prøveperiode
                </Link>
              </li>
              <li>
                <Link to="/kontakt" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Ta kontakt
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Logg inn
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} FieldService. Alle rettigheter forbeholdt.</span>
            <span>Bygget for norske servicebedrifter</span>
          </div>
        </div>
      </footer>

      {/* Sticky mobile bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border px-4 py-3 flex gap-2"
        style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <Button asChild className="flex-1 gap-2 h-10">
          <Link to="/register"><ArrowRight className="w-4 h-4" />Start gratis</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1 h-10">
          <Link to="/kontakt">Ta kontakt</Link>
        </Button>
      </div>
    </div>
  );
}
