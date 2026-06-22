import { useState } from "react";
import { MapPin, Phone, Mail, Instagram, Send, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
      <div className="border-b border-border/40">
        <div className="container mx-auto px-4 max-w-6xl py-12 md:py-16">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-3"
            data-testid="text-contact-title"
          >
            Zakažite Termin
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg max-w-xl"
          >
            Pošaljite upit i kontaktiraćemo vas u roku od 24 sata da dogovorimo detalje.
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl py-10">
        <div className="grid lg:grid-cols-5 gap-10">

          {/* Form — 3/5 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-3"
          >
            <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-border/40 bg-muted/20">
                <h2 className="font-bold text-lg" data-testid="text-form-title">Pošaljite Upit</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Sva polja označena sa * su obavezna</p>
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-14 text-center space-y-5"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                        className="w-20 h-20 rounded-full bg-green-500/10 ring-4 ring-green-500/20 flex items-center justify-center mx-auto"
                      >
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                      </motion.div>
                      <div>
                        <h3 className="text-2xl font-bold mb-2" data-testid="text-success-title">Hvala na upitu!</h3>
                        <p className="text-muted-foreground max-w-xs mx-auto text-sm leading-relaxed">
                          Primili smo vašu poruku i kontaktiraćemo vas u najkraćem mogućem roku.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-full px-4 py-2 w-fit mx-auto">
                        <Clock className="w-4 h-4" />
                        Odgovor u roku od 24 sata
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setSubmitted(false)}
                        className="rounded-xl"
                        data-testid="button-send-another"
                      >
                        Pošalji Još Jedan Upit
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-5">
                          <div className="grid md:grid-cols-2 gap-5">
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ime i Prezime *</FormLabel>
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
                                  <FormLabel>Email *</FormLabel>
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
                                  <FormLabel>Telefon *</FormLabel>
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
                                  <FormLabel>Usluga *</FormLabel>
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
                                <FormLabel>Željeni Termin (Opciono)</FormLabel>
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
                                <FormLabel>Poruka *</FormLabel>
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
                            className="w-full h-12 rounded-xl font-semibold"
                            disabled={mutation.isPending}
                            data-testid="button-submit"
                          >
                            {mutation.isPending ? "Šalje se..." : (
                              <>Pošalji Upit <Send className="ml-2 w-4 h-4" /></>
                            )}
                          </Button>
                        </form>
                      </Form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Sidebar — 2/5 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="lg:col-span-2 space-y-4"
          >
            {/* Contact info */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
              <h3 className="font-bold" data-testid="text-info-title">Kontakt Informacije</h3>
              {contactInfo.map(({ icon: Icon, label, value, href }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.07 }}
                  className="flex items-center gap-3"
                  data-testid={`info-item-${i}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    {href ? (
                      <a href={href} className="text-sm font-medium hover:text-primary transition-colors" target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm font-medium">{value}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Call CTA */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <h3 className="font-bold text-sm" data-testid="text-direct-call-title">Dostupni smo odmah</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Za hitno zakazivanje ili dodatna pitanja, slobodno nas pozovite direktno.
              </p>
              <Button className="w-full rounded-xl" asChild data-testid="button-call">
                <a href="tel:+381637347023">
                  <Phone className="mr-2 w-4 h-4" />
                  Pozovi Sada
                  <ArrowRight className="ml-auto w-4 h-4" />
                </a>
              </Button>
            </div>

            {/* Working hours */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-3">
              <h3 className="font-bold text-sm">Radno Vreme</h3>
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
          </motion.div>

        </div>
      </div>
    </div>
  );
}
