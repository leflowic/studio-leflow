import { useState } from "react";
import { Link } from "wouter";
import { MapPin, Phone, Mail, Instagram, ArrowLeft, Send } from "lucide-react";
import { motion } from "framer-motion";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSubmissionSchema, type InsertContactSubmission } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SEO } from "@/components/SEO";

export default function Contact() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<InsertContactSubmission>({
    resolver: zodResolver(insertContactSubmissionSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      service: "",
      preferredDate: "",
      message: ""
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertContactSubmission) => {
      return await apiRequest("POST", "/api/contact", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      form.reset();
      toast({
        title: "Uspešno poslato!",
        description: "Kontaktiraćemo vas u najkraćem mogućem roku.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message || "Došlo je do greške. Molimo pokušajte ponovo.",
      });
    }
  });

  const onSubmit = (data: InsertContactSubmission) => {
    mutation.mutate(data);
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: "Adresa",
      content: "Beograd, Srbija",
      link: null
    },
    {
      icon: Phone,
      title: "Telefon",
      content: "+381 63 734 7023",
      link: "tel:+381637347023"
    },
    {
      icon: Mail,
      title: "Email",
      content: "info@studioleflow.com",
      link: "mailto:info@studioleflow.com"
    },
    {
      icon: Instagram,
      title: "Instagram",
      content: "@studioleflow",
      link: "https://instagram.com/studioleflow"
    }
  ];

  const services = [
    "Snimanje",
    "Mix/Master (Produkcija)",
    "Instrumental",
    "Gotova pesma"
  ];

  return (
    <div className="min-h-screen py-12 lg:py-20">
      <SEO
        title="Kontakt - Studio LeFlow | Rezervišite Termin za Snimanje"
        description="Kontaktirajte Studio LeFlow za rezervaciju termina. Snimanje pesama, miks i mastering, voice over, podcast produkcija. Beograd, Srbija. Email: info@studioleflow.com, Tel: +381 63 734 7023"
        keywords={[
          "kontakt studio leflow",
          "leflow studio kontakt",
          "leflow kontakt",
          "rezervacija studio beograd",
          "studio termin beograd",
          "muzički studio kontakt",
          "snimanje pesme rezervacija",
          "studio beograd adresa",
          "studio leflow kontakt",
          "leflow studio beograd kontakt",
          "leflow cena",
          "studio rezervacija online"
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" data-testid="button-back-home">
              <ArrowLeft className="mr-2 w-4 h-4" />
              Nazad na Početnu
            </Button>
          </Link>
        </div>

        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight" data-testid="text-contact-title">
            Kontaktirajte Nas
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Zakažite besplatnu konsultaciju ili nas kontaktirajte za bilo kakva pitanja o našim uslugama
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <FadeInWhenVisible delay={0.1} className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl" data-testid="text-form-title">Pošaljite Upit</CardTitle>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="py-12 text-center">
                    <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                      <Send className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3" data-testid="text-success-title">Hvala na upitu!</h3>
                    <p className="text-muted-foreground mb-6">
                      Primili smo vašu poruku i kontaktiraćemo vas u najkraćem mogućem roku.
                    </p>
                    <Button onClick={() => setSubmitted(false)} data-testid="button-send-another">
                      Pošalji Još Jedan Upit
                    </Button>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ime i Prezime *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Vaše ime" 
                                  {...field}
                                  data-testid="input-name"
                                />
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
                                <Input 
                                  type="email"
                                  placeholder="vas@email.com" 
                                  {...field}
                                  data-testid="input-email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefon *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="+381 XX XXX XXXX" 
                                  {...field}
                                  data-testid="input-phone"
                                />
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
                                  {services.map((service) => (
                                    <SelectItem key={service} value={service}>
                                      {service}
                                    </SelectItem>
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
                              <Input 
                                type="date"
                                {...field}
                                value={field.value || ""}
                                data-testid="input-date"
                              />
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
                        className="w-full md:w-auto text-lg"
                        disabled={mutation.isPending}
                        data-testid="button-submit"
                      >
                        {mutation.isPending ? "Šalje se..." : "Pošalji Upit"}
                        <Send className="ml-2 w-5 h-5" />
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </FadeInWhenVisible>

          <FadeInWhenVisible delay={0.2} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-info-title">Kontakt Informacije</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {contactInfo.map((info, index) => (
                  <motion.div 
                    key={index} 
                    className="flex items-start gap-4" 
                    data-testid={`info-item-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
                      <info.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{info.title}</h3>
                      {info.link ? (
                        <a 
                          href={info.link}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {info.content}
                        </a>
                      ) : (
                        <p className="text-muted-foreground">{info.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <h3 className="font-bold mb-3 text-lg" data-testid="text-direct-call-title">
                  Pozovite nas direktno
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Za hitne zakazivanje ili dodatna pitanja, slobodno nas pozovite.
                </p>
                <Button variant="outline" className="w-full" asChild data-testid="button-call">
                  <a href="tel:+381637347023">
                    <Phone className="mr-2 w-4 h-4" />
                    Pozovi Sada
                  </a>
                </Button>
              </CardContent>
            </Card>
          </FadeInWhenVisible>
        </div>
      </div>
    </div>
  );
}
