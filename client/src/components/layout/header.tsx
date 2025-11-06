import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, LogOut, User, Edit3, Save } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEditMode } from "@/contexts/EditModeContext";
import leflowLogo from "@/assets/leflow-logo.png";

export function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const { isEditMode, toggleEditMode } = useEditMode();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/";
      }
    });
  };

  const navigation = [
    { name: "Početna", href: "/" },
    { name: "Giveaway", href: "/giveaway" },
    { name: "Pravila", href: "/pravila" },
    { name: "Tim", href: "/tim" },
    { name: "Kontakt", href: "/kontakt" }
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location === href;
  };

  const scrollToServices = () => {
    if (location !== "/") {
      window.location.href = "/#usluge";
    } else {
      const element = document.getElementById("usluge");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link 
            href="/"
            className="flex items-center gap-2 hover-elevate rounded-lg px-3 py-2 -ml-3" 
            data-testid="link-logo"
          >
            <img 
              src={leflowLogo} 
              alt="Studio LeFlow Logo" 
              className="h-10 w-auto dark:invert transition-all"
            />
            <span className="text-xl font-bold font-[Montserrat] uppercase">STUDIO LEFLOW</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <motion.div key={item.name} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                <Link 
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors hover-elevate ${
                    isActive(item.href)
                      ? "text-primary"
                      : "text-foreground"
                  }`}
                  data-testid={`link-nav-${item.name.toLowerCase()}`}
                >
                  {item.name}
                </Link>
              </motion.div>
            ))}
            {user?.role === 'admin' && (
              <>
                <Link 
                  href="/admin"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors hover-elevate ${
                    isActive("/admin")
                      ? "text-primary"
                      : "text-foreground"
                  }`}
                  data-testid="link-nav-admin"
                >
                  Admin
                </Link>
                {!isActive("/admin") && (
                  <Button
                    variant={isEditMode ? "default" : "outline"}
                    size="sm"
                    onClick={toggleEditMode}
                    className="gap-2"
                    data-testid="button-edit-site"
                  >
                    {isEditMode ? (
                      <>
                        <Save className="w-4 h-4" />
                        Završi Izmene
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4" />
                        Izmeni Sajt
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
            <button
              onClick={scrollToServices}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover-elevate text-foreground"
              data-testid="link-nav-usluge"
            >
              Usluge
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/settings">
                    <User className="h-5 w-5" />
                    <span className="sr-only">Podešavanja</span>
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Odjavi se</span>
                </Button>
              </>
            ) : (
              <Link href="/prijava">
                <Button variant="outline">
                  Prijava
                </Button>
              </Link>
            )}
            <Link href="/kontakt">
              <Button data-testid="button-header-contact">
                Zakažite Termin
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2 hover-elevate rounded-lg"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t" data-testid="mobile-menu">
            <nav className="flex flex-col gap-2">
              {navigation.map((item) => (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors hover-elevate ${
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-foreground"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`link-mobile-${item.name.toLowerCase()}`}
                >
                  {item.name}
                </Link>
              ))}
              {user?.role === 'admin' && (
                <>
                  <Link 
                    href="/admin"
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors hover-elevate ${
                      isActive("/admin")
                        ? "bg-primary/10 text-primary"
                        : "text-foreground"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-mobile-admin"
                  >
                    Admin
                  </Link>
                  {!isActive("/admin") && (
                    <Button
                      variant={isEditMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        toggleEditMode();
                        setMobileMenuOpen(false);
                      }}
                      className="gap-2 mx-4"
                      data-testid="button-mobile-edit-site"
                    >
                      {isEditMode ? (
                        <>
                          <Save className="w-4 h-4" />
                          Završi Izmene
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-4 h-4" />
                          Izmeni Sajt
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
              <button
                onClick={scrollToServices}
                className="px-4 py-3 rounded-lg text-sm font-medium transition-colors hover-elevate text-foreground text-left"
                data-testid="link-mobile-usluge"
              >
                Usluge
              </button>
              <div className="border-t pt-4 mt-2 flex flex-col gap-2">
                <div className="flex items-center justify-between px-4">
                  <span className="text-sm font-medium">Tema</span>
                  <ThemeToggle />
                </div>
                {user ? (
                  <>
                    <Link href="/settings">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Podešavanja
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      disabled={logoutMutation.isPending}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Odjavi se
                    </Button>
                  </>
                ) : (
                  <Link href="/prijava">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Prijava
                    </Button>
                  </Link>
                )}
                <Link href="/kontakt">
                  <Button 
                    className="w-full"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="button-mobile-contact"
                  >
                    Zakažite Termin
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
