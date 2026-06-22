import { useState } from "react";
import { MapPin, Phone, Mail, Instagram, Send, CheckCircle2, Clock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSubmissionSchema, type InsertContactSubmission } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SEO, pageStructuredData } from "@/components/SEO";

const contactInfo = [
  { icon: Phone, label: "Telefon", value: "+381 63 734 7023", href: "tel:+381637347023" },
  { icon: Mail, label: "Email", value: "podrska@studioleflow.com", href: "mailto:podrska@studioleflow.com" },
  { icon: Instagram, label: "Instagram", value: "@studioleflow", href: "https://instagram.com/studioleflow" },
  { icon: MapPin, label: "Adresa", value: "Beograd, Srbija", href: null },
];

const services = ["Snimanje", "Mix/Master (Produkcija)", "Instrumental", "Gotova pesma"];

export default function Contact() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<InsertContactSubmission>({
    resolver: zodResolver(insertContactSubmissionSchema),
    defaultValues: { name: "", email: "", phone: "", service: "", preferredDate: "", message: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertContactSubmission) => apiRequest("POST", "/api/contact", data),
    onSuccess: () => {
      setSubmitted(true);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message || "Došlo je do greške. Molimo pokušajte ponovo.",
      });
    },
  });

  return (
    <div className="min-h-screen">
      <SEO
        title="Kontakt - Studio LeFlow | Rezervišite Termin za Snimanje"
        description="Kontaktirajte Studio LeFlow za rezervaciju termina. Snimanje pesama, miks i mastering, voice over, podcast produkcija. Beograd, Srbija."
        keywords={["kontakt studio leflow", "rezervacija studio beograd", "studio termin beograd", "muzički studio kontakt"]}
        structuredData={pageStructuredData.contact}
      />

      {/* Hero */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--primary)/0.12),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <p className="text-primary text-sm font-semibold uppercase tracking-[0.2em] mb-3">Kontakt</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" data-testid="text-contact-title">
            Zakažite Termin
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Pišite nam ili pozovite — odgovaramo u roku od 24 sata
          </p>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-start">

          {/* Left column — contact info */}
          <div className="space-y-4">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1" data-testid="text-info-title">Kontakt Informacije</h2>
              <p className="text-sm text-muted-foreground">Dostupni smo za vaša pitanja i zakazivanje</p>
            </div>

            <div className="space-y-3">
              {contactInfo.map(({ icon: Icon, label, value, href }) =>
                href ? (
                  <a
                    key={label}
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 p-4 rounded-xl border border-white/[0.07] bg-card/30 hover:border-primary/30 hover:bg-card/60 transition-all duration-300 cursor-pointer"
                    data-testid={`info-item-${label.toLowerCase()}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">{label}</p>
                      <p className="font-semibold">{value}</p>
                    </div>
                  </a>
                ) : (
                  <div
                    key={label}
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.07] bg-card/30"
                    data-testid={`info-item-${label.toLowerCase()}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">{label}</p>
                      <p className="font-semibold">{value}</p>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Call CTA */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <h3 className="font-bold text-sm" data-testid="text-direct-call-title">Dostupni smo odmah</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Za hitno zakazivanje ili dodatna pitanja, slobodno nas pozovite direktno.
              </p>
              <Button className="w-full" asChild data-testid="button-call">
                <a href="tel:+381637347023">
                  <Phone className="mr-2 w-4 h-4" />
                  Pozovi Sada
                  <ArrowRight className="ml-auto w-4 h-4" />
                </a>
              </Button>
            </div>

            {/* Working hours */}
            <div className="rounded-xl border border-white/[0.07] bg-card/30 p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Radno Vreme</h3>
              </div>
              {[
                { day: "Ponedeljak — Petak", time: "10:00 — 22:00" },
                { day: "Subota — Nedjelja", time: "11:00 — 20:00" },
              ].map(({ day, time }) => (
                <div key={day} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{day}</span>
                  <span className="font-medium">{time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — form */}
          <div className="rounded-2xl border border-white/[0.07] bg-card/40 backdrop-blur-sm p-8">
            {submitted ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-3" data-testid="text-success-title">Poruka poslata!</h2>
                <p className="text-muted-foreground mb-8">Javićemo vam se u roku od 24 sata.</p>
                <Button
                  variant="outline"
                  onClick={() => setSubmitted(false)}
                  data-testid="button-send-another"
                >
                  Pošalji Još Jedan Upit
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-6">Pošaljite upit</h2>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium mb-1.5">Ime i Prezime *</FormLabel>
                            <FormControl>
                              <Input placeholder="Vaše ime" {...field} data-testid="input-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium mb-1.5">Email *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="vas@email.com" {...field} data-testid="input-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium mb-1.5">Telefon *</FormLabel>
                            <FormControl>
                              <Input placeholder="+381 XX XXX XXXX" {...field} data-testid="input-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="service"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium mb-1.5">Usluga *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-service">
                                  <SelectValue placeholder="Izaberite uslugu" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {services.map(s => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="preferredDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium mb-1.5">Željeni Termin (Opciono)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ""} data-testid="input-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium mb-1.5">Poruka *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Opišite vaš projekat ili postavite pitanje..."
                              className="min-h-32 resize-none"
                              {...field}
                              data-testid="input-message"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={mutation.isPending}
                      data-testid="button-submit"
                    >
                      {mutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Šalje se...
                        </>
                      ) : (
                        <>
                          Pošalji Upit
                          <Send className="ml-2 w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
