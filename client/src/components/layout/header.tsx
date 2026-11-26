import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  LogOut, Edit3, Save, MessageCircle, LayoutDashboard, Settings,
  Menu, X, ChevronRight, Terminal, ChevronDown, ArrowRight, ArrowUpRight,
  MicVocal, KeyboardMusic, Clapperboard, Podcast, AudioLines, ListMusic,
  FolderOpen, Disc3, Newspaper, Users, ScrollText, Phone,
  MessagesSquare, Gamepad2, Trophy, Music4, Play, Disc, Store, type LucideIcon,
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

// ─── Navigation config ────────────────────────────────────────────────────────
// Three mega-menu groups (desktop hover/click panels, mobile grouped list).
// Order is deliberate and business-first: Usluge (acquisition) before Studio
// (proof) before Zajednica (community/engagement).

type NavItem = { title: string; desc: string; href: string; icon: LucideIcon; external?: boolean };
type NavGroup = { label: string; items: NavItem[] };
type NavMenu = {
  key: string;
  label: string;
  groups: NavGroup[];
  // Right-hand highlight card in the desktop panel
  featured: "consult" | "release" | "game";
  footer: { cta: { label: string; href: string }; links: Array<{ label: string; href: string }> };
};

function buildMenus(loggedIn: boolean): NavMenu[] {
  return [
    {
      key: "usluge",
      label: "Usluge",
      featured: "consult",
      groups: [
        {
          label: "Studio",
          items: [
            { icon: MicVocal, title: "Snimanje, mix i mastering", desc: "Vokal i instrumenti, pa master spreman za objavu", href: "/usluge#snimanje" },
            { icon: KeyboardMusic, title: "Instrumentali i produkcija", desc: "Bit po meri ili kompletna produkcija pesme", href: "/usluge#instrumentali" },
            { icon: Clapperboard, title: "Video produkcija", desc: "Snimanje i montaža muzičkih spotova", href: "/usluge#video" },
          ],
        },
        {
          label: "Dodatno",
          items: [
            { icon: Podcast, title: "Voice over i podcast", desc: "Reklame, podkast epizode, audio knjige", href: "/usluge#dodatne" },
            { icon: AudioLines, title: "Demo snimanje", desc: "Brza verzija pesme za pitch ili arhivu", href: "/usluge#dodatne" },
            { icon: ListMusic, title: "Aranžman i orkestracija", desc: "Instrumenti i harmonije za gotovu pesmu", href: "/usluge#dodatne" },
          ],
        },
      ],
      footer: {
        cta: { label: "Pošaljite upit", href: "/kontakt" },
        links: [
          { label: "Sve usluge", href: "/usluge" },
          { label: "Pravila saradnje", href: "/pravila" },
        ],
      },
    },
    {
      key: "studio",
      label: "Studio",
      featured: "release",
      groups: [
        {
          label: "Rad",
          items: [
            { icon: FolderOpen, title: "Projekti", desc: "Pesme i spotovi na kojima smo radili", href: "/projekti" },
            { icon: Disc3, title: "Pesme iz studija", desc: "Izdanja sa linkovima za sve platforme", href: "https://music.studioleflow.com", external: true },
            { icon: Newspaper, title: "Vesti", desc: "Izdanja, saradnje i dešavanja", href: "/news" },
          ],
        },
        {
          label: "O studiju",
          items: [
            { icon: Users, title: "Tim", desc: "Ko radi na vašoj pesmi", href: "/tim" },
            { icon: ScrollText, title: "Pravila i česta pitanja", desc: "Avans, otkazivanje, revizije", href: "/pravila" },
            { icon: Phone, title: "Kontakt", desc: "Telefon, email i radno vreme", href: "/kontakt" },
          ],
        },
      ],
      footer: {
        cta: { label: "Pogledajte projekte", href: "/projekti" },
        links: [
          { label: "Proveri licencu", href: "/proveri" },
          { label: "Zaštita brenda", href: "/zastita-brenda" },
        ],
      },
    },
    {
      key: "zajednica",
      label: "Zajednica",
      featured: "game",
      groups: [
        {
          label: "Zajednica",
          items: [
            { icon: MessagesSquare, title: "Objave i saradnje", desc: "Šta izvođači objavljuju i s kim traže saradnju", href: "/zajednica" },
            { icon: Gamepad2, title: "Pogodi Pesmu", desc: "Dnevna igra, jedan pokušaj", href: "/igra" },
            { icon: Disc, title: "Ploča dana", desc: "Zavrti jednom dnevno i skupljaj Studio Coins", href: "/ploca" },
            { icon: Store, title: "Prodavnica", desc: "Zameni coine za popuste u studiju", href: "/prodavnica" },
          ],
        },
        {
          label: "Takmičenja",
          items: [
            { icon: Trophy, title: "Giveaway", desc: "Mesečni izazov i glasanje", href: "/giveaway" },
            { icon: Music4, title: "Moje pesme", desc: "Prijavite svoju objavljenu pesmu", href: "/moje-pesme" },
          ],
        },
      ],
      footer: loggedIn
        ? { cta: { label: "Moj nalog", href: "/dashboard" }, links: [{ label: "Poruke", href: "/inbox" }] }
        : { cta: { label: "Napravite besplatan nalog", href: "/registracija" }, links: [{ label: "Prijava", href: "/prijava" }] },
    },
  ];
}

// Hash links (/usluge#video) need a manual scroll: wouter doesn't scroll to
// anchors, and the target page may still be lazy-loading.
function scrollToHash(href: string) {
  const id = href.split("#")[1];
  if (!id) return;
  let tries = 0;
  const attempt = () => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else if (tries++ < 25) setTimeout(attempt, 80);
  };
  setTimeout(attempt, 30);
}

function MenuLink({ item, onNavigate, className, children }: { item: { href: string; external?: boolean }; onNavigate: () => void; className: string; children: React.ReactNode }) {
  if (item.external) {
    return <a href={item.href} target="_blank" rel="noopener noreferrer" className={className} onClick={onNavigate}>{children}</a>;
  }
  return (
    <Link href={item.href} className={className} onClick={() => { onNavigate(); if (item.href.includes("#")) scrollToHash(item.href); }}>
      {children}
    </Link>
  );
}

function FeaturedCard({ kind, onNavigate }: { kind: NavMenu["featured"]; onNavigate: () => void }) {
  // Newest release staff picked for the main site (admin Smart Links → "Izdvoji na sajtu"),
  // not simply the newest smart link. Only fetched once the Studio panel is opened.
  const { data: releases } = useQuery<Array<{ slug: string; title: string; artist: string; coverUrl: string | null }>>({
    queryKey: ["/api/smart-links?featured=1"],
    enabled: kind === "release",
    staleTime: 5 * 60 * 1000,
  });

  if (kind === "release") {
    const latest = Array.isArray(releases) ? releases[0] : undefined;
    return (
      <a
        href={latest ? `https://music.studioleflow.com/${latest.slug}` : "https://music.studioleflow.com"}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className="group block rounded-lg overflow-hidden border border-border bg-background hover:border-primary/40 transition-colors"
      >
        <div className="relative aspect-square bg-muted overflow-hidden">
          {latest?.coverUrl ? (
            <img src={latest.coverUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Disc3 className="w-10 h-10 text-muted-foreground" /></div>
          )}
          <span className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <Play className="w-4 h-4 ml-0.5" />
          </span>
        </div>
        <div className="p-3">
          <p className="text-xs text-muted-foreground">Najnovije izdanje</p>
          <p className="text-sm font-medium truncate mt-0.5">{latest ? latest.title : "Pesme iz studija"}</p>
          {latest && <p className="text-xs text-muted-foreground truncate">{latest.artist}</p>}
        </div>
      </a>
    );
  }

  if (kind === "game") {
    return (
      <Link href="/igra" onClick={onNavigate} className="group flex h-full flex-col rounded-lg border border-border bg-background p-4 hover:border-primary/40 transition-colors">
        <div className="flex items-end gap-[3px] h-10 mb-4" aria-hidden="true">
          {[6, 14, 9, 22, 12, 30, 16, 24, 10, 18, 7, 13].map((h, i) => (
            <span key={i} className="w-[4px] rounded-full bg-primary/60 group-hover:bg-primary transition-colors" style={{ height: h }} />
          ))}
        </div>
        <p className="text-sm font-medium">Pogodi Pesmu</p>
        <p className="text-[13px] leading-snug text-muted-foreground mt-1">Sekund pesme, jedan pokušaj. Nova igra svaki dan.</p>
        <span className="mt-auto pt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
          Igraj <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </Link>
    );
  }

  return (
    <Link href="/kontakt" onClick={onNavigate} className="group block rounded-lg overflow-hidden border border-border bg-background hover:border-primary/40 transition-colors">
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        <img src="/services/wa47-microphone-service.jpg" alt="" className="w-full h-full object-cover saturate-[0.25] transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
      </div>
      <div className="p-3">
        <p className="text-sm font-medium">Besplatna konsultacija</p>
        <p className="text-[13px] leading-snug text-muted-foreground mt-0.5">Pošaljite upit, ponudu dobijate u roku od 24h.</p>
        <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
          Zakažite termin <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}

function MegaPanel({ menu, onNavigate }: { menu: NavMenu; onNavigate: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-popover text-popover-foreground shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)] overflow-hidden">
      <div className="flex">
        <div className="grid flex-1 divide-x divide-border" style={{ gridTemplateColumns: `repeat(${menu.groups.length}, minmax(0, 1fr))` }}>
          {menu.groups.map(group => (
            <div key={group.label} className="p-3">
              <p className="px-3 pt-2 pb-2 text-xs font-medium text-muted-foreground">{group.label}</p>
              <ul>
                {group.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <li key={item.title}>
                      <MenuLink item={item} onNavigate={onNavigate} className="group flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 focus-visible:bg-muted/60 outline-none transition-colors">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
                          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 text-sm font-medium">
                            {item.title}
                            {item.external && <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />}
                          </span>
                          <span className="block text-[13px] leading-snug text-muted-foreground mt-0.5">{item.desc}</span>
                        </span>
                      </MenuLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="w-[232px] shrink-0 border-l border-border bg-muted/25 p-4">
          <FeaturedCard kind={menu.featured} onNavigate={onNavigate} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-6 border-t border-border bg-muted/40 px-6 py-3 text-sm">
        <MenuLink item={menu.footer.cta} onNavigate={onNavigate} className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4">
          {menu.footer.cta.label} <ArrowRight className="w-3.5 h-3.5" />
        </MenuLink>
        <div className="flex items-center gap-5 text-muted-foreground">
          {menu.footer.links.map(l => (
            <MenuLink key={l.label} item={l} onNavigate={onNavigate} className="hover:text-foreground transition-colors">{l.label}</MenuLink>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const navRef = useRef<HTMLDivElement>(null);
  const { user, logoutMutation } = useAuth();
  const { isEditMode, toggleEditMode } = useEditMode();
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocketContext();
  const menus = buildMenus(!!user);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    enabled: !!user && user.emailVerified === true,
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count ?? 0;

  useEffect(() => {
    if (!user || !user.emailVerified) return;
    return subscribe((msg) => {
      if (msg.type === "new_message" || msg.type === "message_read") {
        queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      }
    });
  }, [user, subscribe, queryClient]);

  useEffect(() => { setMobileMenuOpen(false); setOpenMenu(null); }, [location]);

  // Hover intent: open immediately on enter, close with a short delay so the
  // pointer can travel from the trigger down into the panel.
  const openNow = useCallback((key: string) => {
    window.clearTimeout(closeTimer.current);
    setOpenMenu(key);
  }, []);
  const closeSoon = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 140);
  }, []);
  const closeNow = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    setOpenMenu(null);
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeNow(); };
    const onDown = (e: MouseEvent) => { if (navRef.current && !navRef.current.contains(e.target as Node)) closeNow(); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [openMenu, closeNow]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => { window.location.href = "/"; } });
  };

  const menuIsActive = (menu: NavMenu) =>
    menu.groups.some(g => g.items.some(i => !i.external && i.href.split("#")[0] === location));
  const isActive = (href: string) => location === href;
  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "U";
  const activeMenu = menus.find(m => m.key === openMenu);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] bg-background/90 backdrop-blur-xl border-b border-border/70">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0" data-testid="link-logo">
              <img src={leflowLogo} alt="Studio LeFlow" draggable={false} onContextMenu={e => e.preventDefault()} className="h-8 w-auto dark:invert select-none" />
              <span className="hidden sm:inline text-[15px] font-semibold tracking-tight">Studio LeFlow</span>
            </Link>

            {/* Desktop nav + mega panels */}
            <div ref={navRef} className="hidden lg:block relative" onMouseLeave={closeSoon}>
              <nav className="flex items-center gap-1" aria-label="Glavni meni">
                {menus.map(menu => {
                  const open = openMenu === menu.key;
                  const active = menuIsActive(menu);
                  return (
                    <button
                      key={menu.key}
                      type="button"
                      onMouseEnter={() => openNow(menu.key)}
                      onClick={() => (open ? closeNow() : openNow(menu.key))}
                      aria-expanded={open}
                      aria-haspopup="true"
                      className={`h-9 px-3.5 rounded-full text-sm font-medium inline-flex items-center gap-1 border transition-colors ${
                        open || active
                          ? "border-border bg-muted/50 text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid={`link-nav-${menu.key}`}
                    >
                      {menu.label}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                    </button>
                  );
                })}

                {user?.role === "admin" && (
                  <>
                    <Link
                      href="/admin"
                      onMouseEnter={closeSoon}
                      className={`h-9 px-3.5 rounded-full text-sm font-medium inline-flex items-center border transition-colors ${
                        isActive("/admin") ? "border-border bg-muted/50 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid="link-nav-admin"
                    >
                      Admin
                    </Link>
                    {!isActive("/admin") && (
                      <Button variant={isEditMode ? "default" : "outline"} size="sm" onClick={toggleEditMode} className="gap-1.5 h-8 ml-1" data-testid="button-edit-site">
                        {isEditMode ? <><Save className="w-3.5 h-3.5" />Završi</> : <><Edit3 className="w-3.5 h-3.5" />Izmeni</>}
                      </Button>
                    )}
                  </>
                )}
              </nav>

              <AnimatePresence>
                {activeMenu && (
                  // Centered on the viewport, right under the header. Centering lives on
                  // this static wrapper: framer-motion animates `transform` on the inner
                  // element, which would wipe out a -translate-x-1/2 class.
                  <div className="fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] flex justify-center px-4 pointer-events-none">
                    <motion.div
                      key={activeMenu.key}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                      // -mt-3/pt-3: transparent hover bridge overlapping the header's bottom edge
                      className="pointer-events-auto w-full -mt-3 pt-3"
                      style={{ maxWidth: activeMenu.groups.length * 290 + 232 }}
                      onMouseEnter={() => window.clearTimeout(closeTimer.current)}
                    >
                      <MegaPanel menu={activeMenu} onNavigate={closeNow} />
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Desktop right side */}
            <div className="hidden lg:flex items-center gap-1.5 shrink-0">
              <span className="mr-1.5 h-5 w-px bg-border" aria-hidden="true" />
              {user?.role === "admin" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-muted-foreground"
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
                    <Button variant="outline" className="relative h-9 gap-2 pl-1.5 pr-3" data-testid="button-user-menu">
                      <Avatar className="h-6 w-6">
                        {user.avatarUrl
                          ? <AvatarImage src={user.avatarUrl} alt={user.username} />
                          : <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">{initials}</AvatarFallback>
                        }
                      </Avatar>
                      <span className="text-sm font-medium max-w-[96px] truncate">{user.username}</span>
                      {user.emailVerified && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5">
                    <DropdownMenuLabel className="font-normal">
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
                          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer rounded-md" data-testid="link-dropdown-dashboard">
                            <LayoutDashboard className="h-4 w-4 text-muted-foreground" /> Moj nalog
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/inbox" className="flex items-center gap-2 cursor-pointer rounded-md" data-testid="link-dropdown-inbox">
                            <MessageCircle className="h-4 w-4 text-muted-foreground" /> Poruke
                            {unreadCount > 0 && <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-xs">{unreadCount > 9 ? "9+" : unreadCount}</Badge>}
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center gap-2 cursor-pointer rounded-md" data-testid="link-dropdown-settings">
                        <Settings className="h-4 w-4 text-muted-foreground" /> Podešavanja
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending} className="text-destructive focus:text-destructive cursor-pointer rounded-md" data-testid="button-dropdown-logout">
                      <LogOut className="h-4 w-4 mr-2" /> Odjavi se
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/prijava">
                  <Button variant="outline" size="sm" className="h-9 px-4">Prijava</Button>
                </Link>
              )}

              <Link href="/kontakt">
                <Button size="sm" className="h-9 gap-1.5 font-medium px-4" data-testid="button-header-contact">
                  Zakažite termin <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {/* Mobile: right side icons + hamburger */}
            <div className="lg:hidden flex items-center gap-1">
              {user?.emailVerified && <NotificationBell />}
              <button
                className="p-2 rounded-full hover:bg-muted/50 transition-colors relative"
                onClick={() => setMobileMenuOpen(v => !v)}
                data-testid="button-mobile-menu"
                aria-label="Meni"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                {!mobileMenuOpen && unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu: grouped like the desktop mega menu */}
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
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[300px] bg-background border-l border-border shadow-2xl lg:hidden flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
              data-testid="mobile-menu"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-border">
                <span className="text-sm font-semibold">Meni</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-full hover:bg-muted transition-colors" aria-label="Zatvori meni">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                {menus.map(menu => (
                  <div key={menu.key}>
                    <p className="px-3 pb-1.5 text-xs text-muted-foreground">{menu.label}</p>
                    <ul>
                      {menu.groups.flatMap(g => g.items)
                        // the 3 extra services all point at the same section - list it once on mobile
                        .filter((item, i, all) => all.findIndex(o => o.href === item.href) === i)
                        .map(item => {
                          const active = !item.external && item.href.split("#")[0] === location && !item.href.includes("#");
                          return (
                            <li key={item.title}>
                              <MenuLink
                                item={item}
                                onNavigate={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? "bg-muted font-medium" : "hover:bg-muted/60"}`}
                              >
                                <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                                <span className="flex-1">{item.href === "/usluge#dodatne" ? "Ostale usluge" : item.title}</span>
                                {item.external && <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />}
                              </MenuLink>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                ))}

                {user?.role === "admin" && (
                  <div>
                    <p className="px-3 pb-1.5 text-xs text-muted-foreground">Administracija</p>
                    <Link
                      href="/admin"
                      className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive("/admin") ? "bg-muted font-medium" : "hover:bg-muted/60"}`}
                      data-testid="link-mobile-admin"
                    >
                      Admin panel
                    </Link>
                  </div>
                )}
              </nav>

              <div className="p-3 border-t border-border space-y-2">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-2 py-2">
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
                      <ThemeToggle />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {user.emailVerified && (
                        <Link href="/dashboard">
                          <Button variant="outline" size="sm" className="w-full gap-1.5 h-9 text-xs" data-testid="link-mobile-dashboard">
                            <LayoutDashboard className="w-3.5 h-3.5" /> Moj nalog
                          </Button>
                        </Link>
                      )}
                      {user.emailVerified && (
                        <Link href="/inbox">
                          <Button variant="outline" size="sm" className="w-full gap-1.5 h-9 text-xs relative" data-testid="link-mobile-inbox">
                            <MessageCircle className="w-3.5 h-3.5" /> Poruke
                            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                          </Button>
                        </Link>
                      )}
                      <Link href="/settings">
                        <Button variant="outline" size="sm" className="w-full gap-1.5 h-9 text-xs">
                          <Settings className="w-3.5 h-3.5" /> Podešavanja
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" className="w-full h-9 text-xs text-destructive" onClick={handleLogout} disabled={logoutMutation.isPending}>
                        <LogOut className="w-3.5 h-3.5 mr-1.5" /> Odjavi se
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Link href="/prijava" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full h-9 text-xs">Prijava</Button>
                    </Link>
                    <Link href="/registracija" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full h-9 text-xs">Registracija</Button>
                    </Link>
                    <ThemeToggle />
                  </div>
                )}

                <Link href="/kontakt" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full h-10 gap-1.5 text-sm font-medium" data-testid="button-mobile-contact">
                    Zakažite termin <ChevronRight className="w-3.5 h-3.5" />
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
