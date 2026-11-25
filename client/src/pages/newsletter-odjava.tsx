import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

// Landing page for the signed unsubscribe link in newsletter emails
// (GET /api/newsletter/u/:e/:t redirects here with ?status=ok|nevazeci|greska).
const COPY: Record<string, { title: string; text: string }> = {
  ok: { title: "Odjavljeni ste", text: "Više vam nećemo slati newsletter. Emailovi u vezi sa nalogom i vašim poslovima i dalje stižu normalno." },
  nevazeci: { title: "Link nije ispravan", text: "Link za odjavu je oštećen ili nepotpun. Pišite nam na podrska@studioleflow.com i odjavićemo vas ručno." },
  greska: { title: "Odjava trenutno nije uspela", text: "Pokušajte ponovo za par minuta, ili nam pišite na podrska@studioleflow.com." },
};

export default function NewsletterOdjavaPage() {
  const status = new URLSearchParams(window.location.search).get("status") ?? "ok";
  const copy = COPY[status] ?? COPY.ok!;
  return (
    <div className="min-h-[70vh] bg-background">
      <SEO title="Odjava sa newslettera - Studio LeFlow" description="Odjava sa newslettera Studio LeFlow." noIndex={true} />
      <section className="max-w-xl mx-auto px-4 md:px-6 py-24">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{copy.title}</h1>
        <p className="text-muted-foreground mb-8">{copy.text}</p>
        <Link href="/"><Button variant="outline">Početna</Button></Link>
      </section>
    </div>
  );
}
