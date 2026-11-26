import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

// Per-category opt-outs (Podešavanja → Obaveštenja). Server-side: push.ts
// skips a user whose category is off; the weekly report email honours
// "weekly_report" too. The device-level on/off stays in <PushToggle />.

type Prefs = { categories: Array<{ key: string; label: string; desc: string }>; prefs: Record<string, boolean> };
const KEY = ["/api/me/notification-prefs"];

export function NotificationPrefs() {
  const { toast } = useToast();
  const { data } = useQuery<Prefs>({ queryKey: KEY });
  const save = useMutation({
    mutationFn: async (patch: Record<string, boolean>) => (await apiRequest("PUT", "/api/me/notification-prefs", { prefs: patch })).json(),
    onMutate: async (patch) => {
      const prev = queryClient.getQueryData<Prefs>(KEY);
      if (prev) queryClient.setQueryData<Prefs>(KEY, { ...prev, prefs: { ...prev.prefs, ...patch } });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(KEY, ctx.prev);
      toast({ title: "Izmena nije sačuvana", variant: "destructive" });
    },
  });

  if (!data) return null;
  return (
    <div className="mt-6 pt-6 border-t border-border/60">
      <p className="text-sm font-medium">Šta želiš da dobijaš</p>
      <p className="text-xs text-muted-foreground mt-0.5">Isključi samo ono što ti smeta - ostalo nastavlja da stiže.</p>
      <ul className="mt-4 divide-y divide-border/60">
        {data.categories.map(c => (
          <li key={c.key}>
            <label className="flex items-start justify-between gap-6 py-3 cursor-pointer">
              <span>
                <span className="block text-sm">{c.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{c.desc}</span>
              </span>
              <Switch checked={data.prefs[c.key] !== false} onCheckedChange={v => save.mutate({ [c.key]: v })} aria-label={c.label} />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
