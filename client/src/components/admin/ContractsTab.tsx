import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Mail, Trash2, Music, Scale, DollarSign, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Contract {
  id: number;
  contractNumber: string;
  contractType: "mix_master" | "copyright_transfer" | "instrumental_sale";
  contractData: any;
  pdfPath: string | null;
  clientEmail: string | null;
  createdAt: string;
  createdBy: number;
  userId: number | null;
  username: string | null;
}

export function ContractsTab() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [selectedContractType, setSelectedContractType] = useState<"mix_master" | "copyright_transfer" | "instrumental_sale">("mix_master");

  // Users query for assignment
  const { data: users = [] } = useQuery<Array<{ id: number; username: string; email: string }>>({
    queryKey: ["/api/admin/users"],
  });

  // Contract history query
  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/admin/contracts"],
    enabled: activeTab === "history",
  });

  // Generate contract mutation
  const generateMutation = useMutation({
    mutationFn: async (data: { contractType: string; contractData: any }) => {
      const response = await apiRequest("POST", "/api/admin/contracts/generate", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contracts"] });
      toast({
        title: "Uspeh",
        description: "Ugovor je uspešno generisan!",
      });
      setActiveTab("history");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message || "Greška pri generisanju ugovora",
      });
    },
  });

  // Delete contract mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/contracts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contracts"] });
      toast({
        title: "Uspeh",
        description: "Ugovor je uspešno obrisan!",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Greška",
        description: "Greška pri brisanju ugovora",
      });
    },
  });

  // Assign user mutation
  const assignUserMutation = useMutation({
    mutationFn: async ({ contractId, userId }: { contractId: number; userId: number | null }) => {
      await apiRequest("PATCH", `/api/admin/contracts/${contractId}/assign-user`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contracts"] });
      toast({
        title: "Uspeh",
        description: "Korisnik uspešno dodeljen ugovoru!",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Greška",
        description: "Greška pri dodeli korisnika",
      });
    },
  });

  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case "mix_master": return "Mix & Master";
      case "copyright_transfer": return "Prenos autorskih prava";
      case "instrumental_sale": return "Prodaja instrumentala";
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="new">Kreiraj Novi Ugovor</TabsTrigger>
          <TabsTrigger value="history">Istorija Ugovora</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Izaberite Tip Ugovora</CardTitle>
              <CardDescription>
                Popunite formu i automatski generiš PDF ugovor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedContractType} onValueChange={(v) => setSelectedContractType(v as any)}>
                <TabsList className="flex flex-col lg:grid lg:grid-cols-3 w-full gap-2 bg-transparent p-0 h-auto mb-8">
                  <TabsTrigger value="mix_master" className="flex items-center justify-center gap-2" data-testid="tab-contract-mix-master">
                    <Music className="w-4 h-4" />
                    Mix & Master
                  </TabsTrigger>
                  <TabsTrigger value="copyright_transfer" className="flex items-center justify-center gap-2" data-testid="tab-contract-copyright">
                    <Scale className="w-4 h-4" />
                    Autorska prava
                  </TabsTrigger>
                  <TabsTrigger value="instrumental_sale" className="flex items-center justify-center gap-2" data-testid="tab-contract-instrumental">
                    <DollarSign className="w-4 h-4" />
                    Prodaja beat-a
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="mix_master">
                  <MixMasterForm onSubmit={(data) => generateMutation.mutate({ contractType: "mix_master", contractData: data })} isSubmitting={generateMutation.isPending} />
                </TabsContent>

                <TabsContent value="copyright_transfer">
                  <CopyrightTransferForm onSubmit={(data) => generateMutation.mutate({ contractType: "copyright_transfer", contractData: data })} isSubmitting={generateMutation.isPending} />
                </TabsContent>

                <TabsContent value="instrumental_sale">
                  <InstrumentalSaleForm onSubmit={(data) => generateMutation.mutate({ contractType: "instrumental_sale", contractData: data })} isSubmitting={generateMutation.isPending} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Istorija Ugovora
              </CardTitle>
              <CardDescription>
                Svi generisani ugovori sa opcijama za download i slanje emailom
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contractsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Još uvek nema kreiranih ugovora</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card Layout */}
                  <div className="space-y-4 md:hidden">
                    {contracts.map((contract) => (
                      <div key={contract.id} className="rounded-md border bg-card p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="font-semibold text-sm">{contract.contractNumber}</div>
                              <Badge variant="secondary" className="text-xs">
                                {getContractTypeLabel(contract.contractType)}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(contract.createdAt), "dd.MM.yyyy")}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Korisnik:</span>
                            {contract.username ? (
                              <Badge variant="outline" className="text-xs">
                                {contract.username}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Nije dodeljen</span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 pt-2 border-t">
                            <AssignUserDialog
                              contractId={contract.id}
                              contractNumber={contract.contractNumber}
                              currentUserId={contract.userId}
                              currentUsername={contract.username}
                              users={users}
                              onAssign={(userId) => assignUserMutation.mutate({ contractId: contract.id, userId })}
                              isAssigning={assignUserMutation.isPending}
                            />

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`/api/admin/contracts/${contract.id}/download`, '_blank')}
                              data-testid={`button-download-contract-${contract.id}`}
                              className="flex-1"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>

                            <SendEmailDialog contractId={contract.id} contractNumber={contract.contractNumber} />

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" data-testid={`button-delete-contract-${contract.id}`}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Obriši Ugovor?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Da li ste sigurni da želite da obrišete ugovor {contract.contractNumber}?
                                    Ova akcija se ne može poništiti.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Otkaži</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(contract.id)}>
                                    Obriši
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                    ))}
                  </div>

                  {/* Desktop Table Layout */}
                  <div className="hidden md:block rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Broj</TableHead>
                          <TableHead>Tip</TableHead>
                          <TableHead>Dodeljen Korisniku</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead className="text-right">Akcije</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contracts.map((contract) => (
                          <TableRow key={contract.id}>
                            <TableCell className="font-medium">
                              {contract.contractNumber}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {getContractTypeLabel(contract.contractType)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {contract.username ? (
                                <Badge variant="outline" className="text-xs">
                                  {contract.username}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Nije dodeljen</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(contract.createdAt), "dd.MM.yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <AssignUserDialog
                                  contractId={contract.id}
                                  contractNumber={contract.contractNumber}
                                  currentUserId={contract.userId}
                                  currentUsername={contract.username}
                                  users={users}
                                  onAssign={(userId) => assignUserMutation.mutate({ contractId: contract.id, userId })}
                                  isAssigning={assignUserMutation.isPending}
                                />

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(`/api/admin/contracts/${contract.id}/download`, '_blank')}
                                  data-testid={`button-download-contract-${contract.id}`}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>

                                <SendEmailDialog contractId={contract.id} contractNumber={contract.contractNumber} />

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" data-testid={`button-delete-contract-${contract.id}`}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Obriši Ugovor?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Da li ste sigurni da želite da obrišete ugovor {contract.contractNumber}?
                                        Ova akcija se ne može poništiti.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Otkaži</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteMutation.mutate(contract.id)}>
                                        Obriši
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Assign User Dialog Component
function AssignUserDialog({
  contractId,
  contractNumber,
  currentUserId,
  currentUsername,
  users,
  onAssign,
  isAssigning
}: {
  contractId: number;
  contractNumber: string;
  currentUserId: number | null;
  currentUsername: string | null;
  users: Array<{ id: number; username: string; email: string }>;
  onAssign: (userId: number | null) => void;
  isAssigning: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUserId?.toString() || "null");

  const handleAssign = () => {
    const userId = selectedUserId === "null" ? null : parseInt(selectedUserId);
    onAssign(userId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          data-testid={`button-assign-user-${contractId}`}
          title={currentUsername ? `Trenutno dodeljen: ${currentUsername}` : "Dodeli korisniku"}
        >
          <UserPlus className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodeli Ugovor Korisniku</DialogTitle>
          <DialogDescription>
            Ugovor {contractNumber} - Izaberite korisnika koji će videti ovaj ugovor u svom dashboard-u
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {currentUsername && (
            <div className="p-3 bg-muted rounded-md text-sm">
              <span className="text-muted-foreground">Trenutno dodeljen: </span>
              <span className="font-medium">{currentUsername}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label>Korisnik</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger data-testid="select-contract-user">
                <SelectValue placeholder="Izaberite korisnika" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">Nijedan (ukloni dodelu)</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.username} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Otkaži
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isAssigning}
            data-testid="button-confirm-assign-user"
          >
            {isAssigning ? "Dodeljuje se..." : "Dodeli"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Send Email Dialog Component
function SendEmailDialog({ contractId, contractNumber }: { contractId: number; contractNumber: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/admin/contracts/${contractId}/send-email`, { email });
    },
    onSuccess: () => {
      toast({
        title: "Uspeh",
        description: `Email uspešno poslat na ${email}!`,
      });
      setOpen(false);
      setEmail("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Greška",
        description: "Greška pri slanju email-a",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid={`button-email-contract-${contractId}`}>
          <Mail className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pošalji Ugovor Email-om</DialogTitle>
          <DialogDescription>
            Unesite email adresu klijenta za ugovor {contractNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Adresa</Label>
            <Input
              id="email"
              type="email"
              placeholder="klijent@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-contract-email"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Otkaži
          </Button>
          <Button
            onClick={() => sendEmailMutation.mutate()}
            disabled={!email || sendEmailMutation.isPending}
            data-testid="button-send-contract-email"
          >
            {sendEmailMutation.isPending ? "Šalje se..." : "Pošalji"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Mix & Master Form Component
function MixMasterForm({ onSubmit, isSubmitting }: { onSubmit: (data: any) => void; isSubmitting: boolean }) {
  const [formData, setFormData] = useState({
    contractDate: format(new Date(), "dd/MM/yyyy"),
    contractPlace: "Beograd",
    studioName: "LeFlow Studio",
    studioAddress: "",
    studioMaticniBroj: "",
    clientName: "",
    clientAddress: "",
    clientMaticniBroj: "",
    projectName: "",
    channelCount: "",
    deliveryFormat: "WAV 24bit / 44.1 kHz, MP3 320 kbps",
    deliveryDate: "",
    totalAmount: "",
    advancePayment: "",
    remainingPayment: "",
    paymentMethod: "Uplata na račun",
    vocalRecording: "no" as "yes" | "no",
    vocalRights: "client" as "client" | "studio" | "other",
    vocalRightsOther: "",
    jurisdiction: "Beograd",
    copies: "2",
    finalDate: format(new Date(), "dd/MM/yyyy"),
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate remaining payment
      if (field === "totalAmount" || field === "advancePayment") {
        const total = parseFloat(updated.totalAmount || "0");
        const advance = parseFloat(updated.advancePayment || "0");
        updated.remainingPayment = (total - advance).toString();
      }
      
      return updated;
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-6 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Datum Ugovora</Label>
          <Input value={formData.contractDate} onChange={(e) => handleChange("contractDate", e.target.value)} data-testid="input-contract-date" />
        </div>
        <div className="space-y-2">
          <Label>Mesto</Label>
          <Input value={formData.contractPlace} onChange={(e) => handleChange("contractPlace", e.target.value)} data-testid="input-contract-place" />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Studio Podaci</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Naziv Studija</Label>
            <Input value={formData.studioName} onChange={(e) => handleChange("studioName", e.target.value)} data-testid="input-studio-name" />
          </div>
          <div className="space-y-2">
            <Label>Adresa Studija</Label>
            <Input value={formData.studioAddress} onChange={(e) => handleChange("studioAddress", e.target.value)} data-testid="input-studio-address" />
          </div>
          <div className="space-y-2">
            <Label>Matični Broj Studija</Label>
            <Input value={formData.studioMaticniBroj} onChange={(e) => handleChange("studioMaticniBroj", e.target.value)} data-testid="input-studio-mb" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Podaci Klijenta</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ime i Prezime / Poslovno Ime</Label>
            <Input value={formData.clientName} onChange={(e) => handleChange("clientName", e.target.value)} data-testid="input-client-name" required />
          </div>
          <div className="space-y-2">
            <Label>Adresa Klijenta</Label>
            <Input value={formData.clientAddress} onChange={(e) => handleChange("clientAddress", e.target.value)} data-testid="input-client-address" required />
          </div>
          <div className="space-y-2">
            <Label>Matični Broj Klijenta</Label>
            <Input value={formData.clientMaticniBroj} onChange={(e) => handleChange("clientMaticniBroj", e.target.value)} data-testid="input-client-mb" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Detalji Projekta</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Naziv Pesme / Projekta</Label>
            <Input value={formData.projectName} onChange={(e) => handleChange("projectName", e.target.value)} data-testid="input-project-name" required />
          </div>
          <div className="space-y-2">
            <Label>Broj Kanala / Stemova</Label>
            <Input value={formData.channelCount} onChange={(e) => handleChange("channelCount", e.target.value)} data-testid="input-channel-count" required />
          </div>
          <div className="space-y-2">
            <Label>Format Isporuke</Label>
            <Input value={formData.deliveryFormat} onChange={(e) => handleChange("deliveryFormat", e.target.value)} data-testid="input-delivery-format" />
          </div>
          <div className="space-y-2">
            <Label>Rok Isporuke</Label>
            <Input value={formData.deliveryDate} onChange={(e) => handleChange("deliveryDate", e.target.value)} placeholder="DD/MM/YYYY" data-testid="input-delivery-date" required />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Finansije</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ukupna Naknada (RSD)</Label>
            <Input type="number" value={formData.totalAmount} onChange={(e) => handleChange("totalAmount", e.target.value)} data-testid="input-total-amount" required />
          </div>
          <div className="space-y-2">
            <Label>Avans (RSD)</Label>
            <Input type="number" value={formData.advancePayment} onChange={(e) => handleChange("advancePayment", e.target.value)} data-testid="input-advance-payment" required />
          </div>
          <div className="space-y-2">
            <Label>Ostatak (auto)</Label>
            <Input type="number" value={formData.remainingPayment} readOnly className="bg-muted" data-testid="input-remaining-payment" />
          </div>
          <div className="space-y-2">
            <Label>Način Plaćanja</Label>
            <Input value={formData.paymentMethod} onChange={(e) => handleChange("paymentMethod", e.target.value)} data-testid="input-payment-method" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Snimanje Vokala</h3>
        <RadioGroup value={formData.vocalRecording} onValueChange={(v) => handleChange("vocalRecording", v)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="vocal-yes" data-testid="radio-vocal-yes" />
            <Label htmlFor="vocal-yes">Da, vokali su snimljeni u studiju</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="vocal-no" data-testid="radio-vocal-no" />
            <Label htmlFor="vocal-no">Ne</Label>
          </div>
        </RadioGroup>

        {formData.vocalRecording === "yes" && (
          <RadioGroup value={formData.vocalRights} onValueChange={(v) => handleChange("vocalRights", v)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="client" id="rights-client" data-testid="radio-rights-client" />
              <Label htmlFor="rights-client">Sva prava prenose se na Naručioca</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="studio" id="rights-studio" data-testid="radio-rights-studio" />
              <Label htmlFor="rights-studio">Studio zadržava pravo za portfolio</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="other" id="rights-other" data-testid="radio-rights-other" />
              <Label htmlFor="rights-other">Drugo</Label>
            </div>
            {formData.vocalRights === "other" && (
              <Input value={formData.vocalRightsOther} onChange={(e) => handleChange("vocalRightsOther", e.target.value)} placeholder="Unesite..."  data-testid="input-rights-other" />
            )}
          </RadioGroup>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full" data-testid="button-generate-contract">
        {isSubmitting ? "Generiše se..." : "Generiši Ugovor"}
      </Button>
    </form>
  );
}

// Copyright Transfer Form Component (simplified version)
function CopyrightTransferForm({ onSubmit, isSubmitting }: { onSubmit: (data: any) => void; isSubmitting: boolean }) {
  const [formData, setFormData] = useState({
    contractDate: format(new Date(), "dd/MM/yyyy"),
    contractPlace: "Beograd",
    authorName: "LeFlow Studio",
    authorAddress: "",
    authorMaticniBroj: "",
    buyerName: "",
    buyerAddress: "",
    buyerMaticniBroj: "",
    songTitle: "",
    components: {
      text: false,
      music: false,
      vocals: false,
      mixMaster: false,
      other: false,
      otherText: "",
    },
    rightsType: "exclusive" as "exclusive" | "nonexclusive",
    rightsScope: {
      reproduction: false,
      distribution: false,
      performance: false,
      adaptation: false,
      other: false,
      otherText: "",
    },
    territory: "Cela teritorija Srbije",
    duration: "Trajanje zaštite autorskog prava",
    totalAmount: "",
    firstPayment: "",
    firstPaymentDate: "",
    secondPayment: "",
    secondPaymentDate: "",
    paymentMethod: "Uplata na račun",
    authorPercentage: "",
    buyerPercentage: "",
    jurisdiction: "Beograd",
    copies: "2",
    finalDate: format(new Date(), "dd/MM/yyyy"),
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate percentage
      if (field === "authorPercentage") {
        const author = parseFloat(value || "0");
        updated.buyerPercentage = (100 - author).toString();
      }
      if (field === "buyerPercentage") {
        const buyer = parseFloat(value || "0");
        updated.authorPercentage = (100 - buyer).toString();
      }
      
      return updated;
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-6 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Datum Ugovora</Label>
          <Input value={formData.contractDate} onChange={(e) => handleChange("contractDate", e.target.value)} data-testid="input-contract-date-copyright" />
        </div>
        <div className="space-y-2">
          <Label>Mesto</Label>
          <Input value={formData.contractPlace} onChange={(e) => handleChange("contractPlace", e.target.value)} data-testid="input-contract-place-copyright" />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Autor/Prodavac</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ime i Prezime</Label>
            <Input value={formData.authorName} onChange={(e) => handleChange("authorName", e.target.value)} data-testid="input-author-name" required />
          </div>
          <div className="space-y-2">
            <Label>Adresa</Label>
            <Input value={formData.authorAddress} onChange={(e) => handleChange("authorAddress", e.target.value)} data-testid="input-author-address" required />
          </div>
          <div className="space-y-2">
            <Label>Matični Broj</Label>
            <Input value={formData.authorMaticniBroj} onChange={(e) => handleChange("authorMaticniBroj", e.target.value)} data-testid="input-author-mb" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Kupac</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ime i Prezime</Label>
            <Input value={formData.buyerName} onChange={(e) => handleChange("buyerName", e.target.value)} data-testid="input-buyer-name" required />
          </div>
          <div className="space-y-2">
            <Label>Adresa</Label>
            <Input value={formData.buyerAddress} onChange={(e) => handleChange("buyerAddress", e.target.value)} data-testid="input-buyer-address" required />
          </div>
          <div className="space-y-2">
            <Label>Matični Broj</Label>
            <Input value={formData.buyerMaticniBroj} onChange={(e) => handleChange("buyerMaticniBroj", e.target.value)} data-testid="input-buyer-mb" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Delo</h3>
        <div className="space-y-2">
          <Label>Naziv Pesme</Label>
          <Input value={formData.songTitle} onChange={(e) => handleChange("songTitle", e.target.value)} data-testid="input-song-title" required />
        </div>
        <div className="space-y-2">
          <Label>Komponente Dela</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox checked={formData.components.text} onCheckedChange={(v) => handleChange("components", { ...formData.components, text: !!v })} data-testid="checkbox-component-text" />
              <Label>Tekst</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox checked={formData.components.music} onCheckedChange={(v) => handleChange("components", { ...formData.components, music: !!v })} data-testid="checkbox-component-music" />
              <Label>Muzika (instrumental)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox checked={formData.components.vocals} onCheckedChange={(v) => handleChange("components", { ...formData.components, vocals: !!v })} data-testid="checkbox-component-vocals" />
              <Label>Snimanje vokala</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox checked={formData.components.mixMaster} onCheckedChange={(v) => handleChange("components", { ...formData.components, mixMaster: !!v })} data-testid="checkbox-component-mixmaster" />
              <Label>Miks i mastering</Label>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Prava</h3>
        <RadioGroup value={formData.rightsType} onValueChange={(v) => handleChange("rightsType", v)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="exclusive" id="rights-exclusive" data-testid="radio-rights-exclusive" />
            <Label htmlFor="rights-exclusive">Isključiva prava</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="nonexclusive" id="rights-nonexclusive" data-testid="radio-rights-nonexclusive" />
            <Label htmlFor="rights-nonexclusive">Neisključiva prava</Label>
          </div>
        </RadioGroup>

        <div className="space-y-2">
          <Label>Obuhvat Prenosa Prava</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox checked={formData.rightsScope.reproduction} onCheckedChange={(v) => handleChange("rightsScope", { ...formData.rightsScope, reproduction: !!v })} data-testid="checkbox-scope-reproduction" />
              <Label>Reprodukovanje i umnožavanje dela</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox checked={formData.rightsScope.distribution} onCheckedChange={(v) => handleChange("rightsScope", { ...formData.rightsScope, distribution: !!v })} data-testid="checkbox-scope-distribution" />
              <Label>Distribucija i digitalna prodaja</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox checked={formData.rightsScope.performance} onCheckedChange={(v) => handleChange("rightsScope", { ...formData.rightsScope, performance: !!v })} data-testid="checkbox-scope-performance" />
              <Label>Javno izvođenje i emitovanje</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox checked={formData.rightsScope.adaptation} onCheckedChange={(v) => handleChange("rightsScope", { ...formData.rightsScope, adaptation: !!v })} data-testid="checkbox-scope-adaptation" />
              <Label>Prerada i adaptacija</Label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Teritorija Korišćenja</Label>
            <Input value={formData.territory} onChange={(e) => handleChange("territory", e.target.value)} data-testid="input-territory" />
          </div>
          <div className="space-y-2">
            <Label>Trajanje Prenosa Prava</Label>
            <Input value={formData.duration} onChange={(e) => handleChange("duration", e.target.value)} data-testid="input-duration" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Finansije</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ukupna Naknada (RSD)</Label>
            <Input type="number" value={formData.totalAmount} onChange={(e) => handleChange("totalAmount", e.target.value)} data-testid="input-total-amount-copyright" required />
          </div>
          <div className="space-y-2">
            <Label>Način Plaćanja</Label>
            <Input value={formData.paymentMethod} onChange={(e) => handleChange("paymentMethod", e.target.value)} data-testid="input-payment-method-copyright" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Podela Streaming Prihoda</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Autor (%)</Label>
              <Input type="number" value={formData.authorPercentage} onChange={(e) => handleChange("authorPercentage", e.target.value)} data-testid="input-author-percentage" />
            </div>
            <div className="space-y-2">
              <Label>Kupac (auto %)</Label>
              <Input type="number" value={formData.buyerPercentage} readOnly className="bg-muted" data-testid="input-buyer-percentage" />
            </div>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full" data-testid="button-generate-contract-copyright">
        {isSubmitting ? "Generiše se..." : "Generiši Ugovor"}
      </Button>
    </form>
  );
}

// Instrumental Sale Form Component (simplified version)
function InstrumentalSaleForm({ onSubmit, isSubmitting }: { onSubmit: (data: any) => void; isSubmitting: boolean }) {
  const [formData, setFormData] = useState({
    contractDate: format(new Date(), "dd/MM/yyyy"),
    contractPlace: "Beograd",
    authorName: "LeFlow Studio",
    authorAddress: "",
    authorMaticniBroj: "",
    buyerName: "",
    buyerAddress: "",
    buyerMaticniBroj: "",
    instrumentalName: "",
    duration: "",
    rightsType: "nonexclusive" as "exclusive" | "nonexclusive",
    rightsScope: {
      reproduction: false,
      distribution: false,
      performance: false,
      adaptation: false,
      other: false,
      otherText: "",
    },
    territory: "Cela teritorija Srbije",
    durationPeriod: "Trajanje zaštite autorskog prava",
    totalAmount: "",
    advancePayment: "",
    remainingPayment: "",
    paymentMethod: "Uplata na račun",
    authorPercentage: "",
    buyerPercentage: "",
    jurisdiction: "Beograd",
    copies: "2",
    finalDate: format(new Date(), "dd/MM/yyyy"),
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate remaining payment
      if (field === "totalAmount" || field === "advancePayment") {
        const total = parseFloat(updated.totalAmount || "0");
        const advance = parseFloat(updated.advancePayment || "0");
        updated.remainingPayment = (total - advance).toString();
      }
      
      // Auto-calculate percentage
      if (field === "authorPercentage") {
        const author = parseFloat(value || "0");
        updated.buyerPercentage = (100 - author).toString();
      }
      if (field === "buyerPercentage") {
        const buyer = parseFloat(value || "0");
        updated.authorPercentage = (100 - buyer).toString();
      }
      
      return updated;
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-6 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Datum Ugovora</Label>
          <Input value={formData.contractDate} onChange={(e) => handleChange("contractDate", e.target.value)} data-testid="input-contract-date-instrumental" />
        </div>
        <div className="space-y-2">
          <Label>Mesto</Label>
          <Input value={formData.contractPlace} onChange={(e) => handleChange("contractPlace", e.target.value)} data-testid="input-contract-place-instrumental" />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Autor/Prodavac (Studio)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ime i Prezime</Label>
            <Input value={formData.authorName} onChange={(e) => handleChange("authorName", e.target.value)} data-testid="input-author-name-instrumental" required />
          </div>
          <div className="space-y-2">
            <Label>Adresa</Label>
            <Input value={formData.authorAddress} onChange={(e) => handleChange("authorAddress", e.target.value)} data-testid="input-author-address-instrumental" required />
          </div>
          <div className="space-y-2">
            <Label>Matični Broj</Label>
            <Input value={formData.authorMaticniBroj} onChange={(e) => handleChange("authorMaticniBroj", e.target.value)} data-testid="input-author-mb-instrumental" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Kupac</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ime i Prezime</Label>
            <Input value={formData.buyerName} onChange={(e) => handleChange("buyerName", e.target.value)} data-testid="input-buyer-name-instrumental" required />
          </div>
          <div className="space-y-2">
            <Label>Adresa</Label>
            <Input value={formData.buyerAddress} onChange={(e) => handleChange("buyerAddress", e.target.value)} data-testid="input-buyer-address-instrumental" required />
          </div>
          <div className="space-y-2">
            <Label>Matični Broj</Label>
            <Input value={formData.buyerMaticniBroj} onChange={(e) => handleChange("buyerMaticniBroj", e.target.value)} data-testid="input-buyer-mb-instrumental" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Instrumental</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Naziv Instrumentala</Label>
            <Input value={formData.instrumentalName} onChange={(e) => handleChange("instrumentalName", e.target.value)} data-testid="input-instrumental-name" required />
          </div>
          <div className="space-y-2">
            <Label>Trajanje</Label>
            <Input value={formData.duration} onChange={(e) => handleChange("duration", e.target.value)} placeholder="npr. 3:45" data-testid="input-instrumental-duration" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Prava</h3>
        <RadioGroup value={formData.rightsType} onValueChange={(v) => handleChange("rightsType", v)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="exclusive" id="rights-exclusive-inst" data-testid="radio-rights-exclusive-instrumental" />
            <Label htmlFor="rights-exclusive-inst">Isključiva prava</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="nonexclusive" id="rights-nonexclusive-inst" data-testid="radio-rights-nonexclusive-instrumental" />
            <Label htmlFor="rights-nonexclusive-inst">Neisključiva prava</Label>
          </div>
        </RadioGroup>

        <div className="space-y-2">
          <Label>Obuhvat Prenosa Prava</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox checked={formData.rightsScope.reproduction} onCheckedChange={(v) => handleChange("rightsScope", { ...formData.rightsScope, reproduction: !!v })} data-testid="checkbox-scope-reproduction-instrumental" />
              <Label>Reprodukovanje i umnožavanje</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox checked={formData.rightsScope.distribution} onCheckedChange={(v) => handleChange("rightsScope", { ...formData.rightsScope, distribution: !!v })} data-testid="checkbox-scope-distribution-instrumental" />
              <Label>Distribucija i digitalna prodaja</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox checked={formData.rightsScope.performance} onCheckedChange={(v) => handleChange("rightsScope", { ...formData.rightsScope, performance: !!v })} data-testid="checkbox-scope-performance-instrumental" />
              <Label>Javno izvođenje i emitovanje</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox checked={formData.rightsScope.adaptation} onCheckedChange={(v) => handleChange("rightsScope", { ...formData.rightsScope, adaptation: !!v })} data-testid="checkbox-scope-adaptation-instrumental" />
              <Label>Prerada i adaptacija</Label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Teritorija Korišćenja</Label>
            <Input value={formData.territory} onChange={(e) => handleChange("territory", e.target.value)} data-testid="input-territory-instrumental" />
          </div>
          <div className="space-y-2">
            <Label>Trajanje Prenosa Prava</Label>
            <Input value={formData.durationPeriod} onChange={(e) => handleChange("durationPeriod", e.target.value)} data-testid="input-duration-period-instrumental" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Finansije</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ukupna Naknada (RSD)</Label>
            <Input type="number" value={formData.totalAmount} onChange={(e) => handleChange("totalAmount", e.target.value)} data-testid="input-total-amount-instrumental" required />
          </div>
          <div className="space-y-2">
            <Label>Avans (RSD)</Label>
            <Input type="number" value={formData.advancePayment} onChange={(e) => handleChange("advancePayment", e.target.value)} data-testid="input-advance-payment-instrumental" required />
          </div>
          <div className="space-y-2">
            <Label>Ostatak (auto)</Label>
            <Input type="number" value={formData.remainingPayment} readOnly className="bg-muted" data-testid="input-remaining-payment-instrumental" />
          </div>
          <div className="space-y-2">
            <Label>Način Plaćanja</Label>
            <Input value={formData.paymentMethod} onChange={(e) => handleChange("paymentMethod", e.target.value)} data-testid="input-payment-method-instrumental" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Podela Streaming Prihoda</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Autor (%)</Label>
              <Input type="number" value={formData.authorPercentage} onChange={(e) => handleChange("authorPercentage", e.target.value)} data-testid="input-author-percentage-instrumental" />
            </div>
            <div className="space-y-2">
              <Label>Kupac (auto %)</Label>
              <Input type="number" value={formData.buyerPercentage} readOnly className="bg-muted" data-testid="input-buyer-percentage-instrumental" />
            </div>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full" data-testid="button-generate-contract-instrumental">
        {isSubmitting ? "Generiše se..." : "Generiši Ugovor"}
      </Button>
    </form>
  );
}
