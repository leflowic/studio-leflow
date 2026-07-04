import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Shield, Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { sr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SEO } from "@/components/SEO";

interface VerifyResult {
  valid: boolean;
  licenseNumber?: string;
  licenseType?: string;
  issuedTo?: string;
  subject?: string;
  issuedAt?: string;
}

export default function VerifyLicensePage() {
  const [, params] = useRoute("/proveri/:hash");
  const hash = params?.hash ?? "";
  const [, navigate] = useLocation();
  const [inputCode, setInputCode] = useState("");

  const { data, isLoading, isError } = useQuery<VerifyResult>({
    queryKey: [`/api/verify/${hash}`],
    queryFn: async () => {
      const res = await fetch(`/api/verify/${hash}`);
      if (!res.ok) throw new Error("Greška");
      return res.json();
    },
    enabled: !!hash,
    retry: false,
  });

  const handleSearch = () => {
    const code = inputCode.trim();
    if (code) navigate(`/proveri/${code}`);
  };

  return (
    <>
      <SEO
        title="Verifikacija Licence - Studio LeFlow"
        description="Proverite autentičnost vaše Studio LeFlow licence. Unesite verifikacioni kod sa PDF-a da biste potvrdili da je licenca validna i izdata od Studio LeFlow."
        keywords={["verifikacija licence studio leflow", "provjera licence", "studio leflow licenca", "autentičnost licence"]}
        canonicalUrl="/proveri"
      />
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="text-lg font-semibold">Studio LeFlow</span>
          </div>
          <p className="text-sm text-muted-foreground">Verifikacija autentičnosti licence</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card shadow-lg overflow-hidden">

          {/* No hash - show search input */}
          {!hash && (
            <div className="px-6 py-8 space-y-5">
              <div className="text-center space-y-1">
                <Shield className="w-12 h-12 text-primary mx-auto mb-3 opacity-80" />
                <p className="font-semibold text-base">Unesite verifikacioni kod</p>
                <p className="text-sm text-muted-foreground">
                  Kod se nalazi na dnu PDF licence koju ste dobili od Studio LeFlow.
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nalepite verifikacioni kod..."
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="font-mono text-sm"
                />
                <Button onClick={handleSearch} disabled={!inputCode.trim()}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Loading */}
          {hash && isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Provera licence...</p>
            </div>
          )}

          {/* Error */}
          {hash && isError && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 px-6 text-center">
              <XCircle className="w-14 h-14 text-destructive" />
              <div>
                <p className="font-semibold text-lg">Greška pri proveri</p>
                <p className="text-muted-foreground text-sm mt-1">Pokušajte ponovo kasnije.</p>
              </div>
            </div>
          )}

          {/* Result */}
          {hash && !isLoading && !isError && data && (
            <>
              <div className={`px-6 py-5 flex items-center gap-4 ${data.valid ? "bg-green-500/10" : "bg-destructive/10"}`}>
                {data.valid ? (
                  <CheckCircle2 className="w-10 h-10 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-10 h-10 text-destructive flex-shrink-0" />
                )}
                <div>
                  <p className={`font-bold text-lg ${data.valid ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                    {data.valid ? "Licenca je VAŽEĆA" : "Licenca NIJE PRONAĐENA"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.valid
                      ? "Ova licenca je autentična i izdata od Studio LeFlow."
                      : "Ne postoji licenca sa ovim verifikacionim kodom."}
                  </p>
                </div>
              </div>

              {data.valid && (
                <div className="px-6 py-5 space-y-4">
                  <Detail label="Broj licence" value={data.licenseNumber} />
                  <Detail label="Tip licence" value={data.licenseType} />
                  <Detail label="Izdato korisniku" value={data.issuedTo} />
                  {data.subject && data.subject !== "N/A" && (
                    <Detail label="Naziv dela / projekta" value={data.subject} />
                  )}
                  {data.issuedAt && (
                    <Detail
                      label="Datum izdavanja"
                      value={format(new Date(data.issuedAt), "dd. MMMM yyyy.", { locale: sr })}
                    />
                  )}
                </div>
              )}

              {/* Search another */}
              <div className="px-6 pb-5">
                <div className="flex gap-2 pt-2 border-t">
                  <Input
                    placeholder="Proveri drugi kod..."
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" onClick={handleSearch} disabled={!inputCode.trim()}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Studio LeFlow · studioleflow.com
        </p>
      </div>
    </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="font-medium text-sm">{value ?? "-"}</span>
    </div>
  );
}
