import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LogOut, Edit3, Save, MessageCircle, LayoutDashboard, Settings,
  Menu, X, Gift, Users, Video, Users2, ScrollText, Layers, ChevronRight, Terminal, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEditMode } from "@/contexts/EditModeContext";
import { NotificationBell } from "@/components/NotificationBell";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import leflowLogo from "@/assets/leflow-logo.png";

const desktopNav = [
  { name: "Usluge",    href: "/usluge",    icon: Layers },
  { name: "Projekti",  href: "/projekti",  icon: Video },
  { name: "Zajednica", href: "/zajednica", icon: Users },
];

// Items that live in the "Još" dropdown on desktop
const moreNav = [
  { name: "Giveaway", href: "/giveaway", icon: Gift },
  { name: "Tim",      href: "/tim",      icon: Users2 },
  { name: "Pravila",  href: "/pravila",  icon: ScrollText },
];

const mobileNav = [...desktopNav, ...moreNav];

export function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logoutMutation } = useAuth();
  const { isEditMode, toggleEditMode } = useEditMode();
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocketContext();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    enabled: !!user && user.emailVerified === true,
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count ?? 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!user || !user.emailVerified) return;
    return subscribe((msg) => {
      if (msg.type === "new_message" || msg.type === "message_read") {
        queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      }
    });
  }, [user, subscribe, queryClient]);

  useEffect(() => { setMobileMenuOpen(false); }, [location]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => { window.location.href = "/"; } });
  };

  const isActive = (href: string) => location === href;

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-xl border-b border-border/80 shadow-sm"
          : "bg-background/70 backdrop-blur-md border-b border-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 -ml-2 px-2 py-2 rounded-xl hover:bg-muted/50 transition-colors shrink-0" data-testid="link-logo">
              <img src={leflowLogo} alt="Studio LeFlow" draggable={false} onContextMenu={e => e.preventDefault()} className="h-8 md:h-9 w-auto dark:invert select-none" />
              <span className="hidden sm:inline text-sm font-bold font-[Montserrat] uppercase tracking-wide">Studio LeFlow</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {desktopNav.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 group ${
                    isActive(item.href) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`link-nav-${item.name.toLowerCase()}`}
                >
                  {isActive(item.href) && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <item.icon className={`w-3.5 h-3.5 relative z-10 transition-transform group-hover:scale-110 ${isActive(item.href) ? "text-primary" : ""}`} />
                  <span className="relative z-10">{item.name}</span>
                </Link>
              ))}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`relative px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1 group ${
                    moreNav.some(i => isActive(i.href)) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}>
                    {moreNav.some(i => isActive(i.href)) && (
                      <motion.div layoutId="nav-pill" className="absolute inset-0 bg-primary/10 rounded-xl" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />
                    )}
                    <span className="relative z-10">Još</span>
                    <ChevronDown className="w-3.5 h-3.5 relative z-10 transition-transform group-data-[state=open]:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44 rounded-xl mt-1">
                  {moreNav.map(item => (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2 cursor-pointer ${isActive(item.href) ? "text-primary" : ""}`}
                      >
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                        {item.name}
                        {isActive(item.href) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {user?.role === "admin" && (
                <>
                  <Link
                    href="/admin"
                    className={`relative px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                      isActive("/admin") ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="link-nav-admin"
                  >
                    {isActive("/admin") && (
                      <motion.div layoutId="nav-pill" className="absolute inset-0 bg-primary/10 rounded-xl" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />
                    )}
                    <span className="relative z-10">Admin</span>
                  </Link>
                  {!isActive("/admin") && (
                    <Button variant={isEditMode ? "default" : "outline"} size="sm" onClick={toggleEditMode} className="gap-1.5 h-8 ml-1" data-testid="button-edit-site">
                      {isEditMode ? <><Save className="w-3.5 h-3.5" />Završi</> : <><Edit3 className="w-3.5 h-3.5" />Izmeni</>}
                    </Button>
                  )}
                </>
              )}
            </nav>

            {/* Desktop right side */}
            <div className="hidden lg:flex items-center gap-1.5 shrink-0">
              {user?.role === "admin" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-xl p-0 text-muted-foreground hover:text-emerald-400"
                  title="Dev console"
                  onClick={() => window.dispatchEvent(new CustomEvent("toggle-debug-console"))}
                >
                  <Terminal className="w-4 h-4" />
                </Button>
              )}
              <ThemeToggle />
              {user?.emailVerified && <NotificationBell />}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 gap-2 px-2.5 rounded-xl" data-testid="button-user-menu">
                      <Avatar className="h-7 w-7">
                        {user.avatarUrl
                          ? <AvatarImage src={user.avatarUrl} alt={user.username} />
                          : <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{initials}</AvatarFallback>
                        }
                      </Avatar>
                      <span className="text-sm font-medium max-w-[80px] truncate">{user.username}</span>
                      {user.emailVerified && unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl">
                    <DropdownMenuLabel>
                      <div className="flex items-center gap-2.5 py-1">
                        <Avatar className="h-8 w-8">
                          {user.avatarUrl
                            ? <AvatarImage src={user.avatarUrl} alt={user.username} />
                            : <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{initials}</AvatarFallback>
                          }
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{user.username}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user.emailVerified && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer" data-testid="link-dropdown-dashboard">
                            <LayoutDashboard className="h-4 w-4 text-muted-foreground" /> Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/inbox" className="flex items-center gap-2 cursor-pointer" data-testid="link-dropdown-inbox">
                            <MessageCircle className="h-4 w-4 text-muted-foreground" /> Poruke
                            {unreadCount > 0 && <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-xs">{unreadCount > 9 ? "9+" : unreadCount}</Badge>}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center gap-2 cursor-pointer" data-testid="link-dropdown-settings">
                        <Settings className="h-4 w-4 text-muted-foreground" /> Podešavanja
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending} className="text-destructive focus:text-destructive cursor-pointer" data-testid="button-dropdown-logout">
                      <LogOut className="h-4 w-4 mr-2" /> Odjavi se
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/prijava">
                  <Button variant="ghost" size="sm" className="h-9 rounded-xl px-3">Prijava</Button>
                </Link>
              )}

              <Link href="/kontakt">
                <Button size="sm" className="h-9 rounded-xl gap-1.5 font-medium px-4" data-testid="button-header-contact">
                  Zakažite Termin <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {/* Mobile: right side icons + hamburger */}
            <div className="lg:hidden flex items-center gap-1">
              {user?.emailVerified && <NotificationBell />}
              <button
                className="p-2 rounded-xl hover:bg-muted/50 transition-colors relative"
                onClick={() => setMobileMenuOpen(v => !v)}
                data-testid="button-mobile-menu"
                aria-label="Meni"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={mobileMenuOpen ? "x" : "menu"} initial={{ opacity: 0, rotate: -90, scale: 0.7 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: 90, scale: 0.7 }} transition={{ duration: 0.15 }}>
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </motion.div>
                </AnimatePresence>
                {!mobileMenuOpen && unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[280px] bg-background border-l border-border/60 shadow-2xl lg:hidden flex flex-col"
              data-testid="mobile-menu"
            >
              <div className="flex items-center justify-between p-4 border-b border-border/60">
                <span className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Meni</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {mobileNav.map((item, i) => (
                  <motion.div key={item.name} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive(item.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                      data-testid={`link-mobile-${item.name.toLowerCase()}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive(item.href) ? "bg-primary/20" : "bg-muted"}`}>
                        <item.icon className={`w-4 h-4 ${isActive(item.href) ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      {item.name}
                      {isActive(item.href) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                    </Link>
                  </motion.div>
                ))}

                {user?.role === "admin" && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (mobileNav.length + 1) * 0.04 }}>
                    <Link
                      href="/admin"
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive("/admin") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                      data-testid="link-mobile-admin"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive("/admin") ? "bg-primary/20" : "bg-muted"}`}>
                        <Settings className={`w-4 h-4 ${isActive("/admin") ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      Admin
                    </Link>
                  </motion.div>
                )}
              </nav>

              <div className="p-3 border-t border-border/60 space-y-2">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/50">
                      <Avatar className="h-9 w-9">
                        {user.avatarUrl
                          ? <AvatarImage src={user.avatarUrl} alt={user.username} />
                          : <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">{initials}</AvatarFallback>
                        }
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{user.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>

                    {user.emailVerified && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <Link href="/dashboard">
                          <Button variant="outline" size="sm" className="w-full gap-1.5 h-9 rounded-xl text-xs" data-testid="link-mobile-dashboard">
                            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                          </Button>
                        </Link>
                        <Link href="/inbox">
                          <Button variant="outline" size="sm" className="w-full gap-1.5 h-9 rounded-xl text-xs relative" data-testid="link-mobile-inbox">
                            <MessageCircle className="w-3.5 h-3.5" /> Poruke
                            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                          </Button>
                        </Link>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-1.5">
                      <Link href="/settings">
                        <Button variant="outline" size="sm" className="w-full gap-1.5 h-9 rounded-xl text-xs">
                          <Settings className="w-3.5 h-3.5" /> Podešavanja
                        </Button>
                      </Link>
                      <div className="flex items-center justify-center gap-2 border rounded-xl h-9 px-3">
                        <span className="text-xs text-muted-foreground">Tema</span>
                        <ThemeToggle />
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full h-9 rounded-xl text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleLogout} disabled={logoutMutation.isPending}>
                      <LogOut className="w-3.5 h-3.5 mr-1.5" /> Odjavi se
                    </Button>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <Link href="/prijava" className="col-span-1">
                        <Button variant="outline" size="sm" className="w-full h-9 rounded-xl text-xs">Prijava</Button>
                      </Link>
                      <Link href="/registracija" className="col-span-1">
                        <Button size="sm" className="w-full h-9 rounded-xl text-xs">Registracija</Button>
                      </Link>
                    </div>
                    <div className="flex items-center justify-center gap-2 border rounded-xl h-9 px-3">
                      <span className="text-xs text-muted-foreground">Tema</span>
                      <ThemeToggle />
                    </div>
                  </div>
                )}

                <Link href="/kontakt" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full h-9 rounded-xl gap-1.5 text-xs font-medium" data-testid="button-mobile-contact">
                    Zakažite Termin <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
