import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

type Feature = { icon: string; title: string; description: string };
type CmsData = {
  headline: string;
  subheadline: string;
  cta_text: string;
  features: Feature[];
  om_oss: string;
  faq: string;
};

async function fetchCms(): Promise<CmsData> {
  const { data } = await (supabase as any)
    .from("platform_settings")
    .select("key, value")
    .like("key", "cms.%");
  const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
  let features: Feature[] = [];
  try { features = JSON.parse(map["cms.features"] ?? "[]"); } catch {}
  return {
    headline: map["cms.hero.headline"] ?? "",
    subheadline: map["cms.hero.subheadline"] ?? "",
    cta_text: map["cms.hero.cta_text"] ?? "",
    features,
    om_oss: map["cms.om_oss"] ?? "",
    faq: map["cms.faq"] ?? "",
  };
}

async function upsertSetting(key: string, value: string) {
  const { data: existing } = await (supabase as any)
    .from("platform_settings")
    .select("id")
    .eq("key", key)
    .single();
  if (existing?.id) {
    await (supabase as any).from("platform_settings").update({ value }).eq("key", key);
  } else {
    await (supabase as any).from("platform_settings").insert({ key, value });
  }
}

export default function AdminCmsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["cms_settings"], queryFn: fetchCms });

  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [omOss, setOmOss] = useState("");
  const [faqJson, setFaqJson] = useState("");
  const [faqError, setFaqError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setHeadline(data.headline);
    setSubheadline(data.subheadline);
    setCtaText(data.cta_text);
    setFeatures(data.features);
    setOmOss(data.om_oss);
    setFaqJson(data.faq ? JSON.stringify(JSON.parse(data.faq), null, 2) : "");
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (faqJson.trim()) {
        try { JSON.parse(faqJson); } catch { throw new Error("FAQ-innhold er ugyldig JSON"); }
      }
      await Promise.all([
        upsertSetting("cms.hero.headline", headline),
        upsertSetting("cms.hero.subheadline", subheadline),
        upsertSetting("cms.hero.cta_text", ctaText),
        upsertSetting("cms.features", JSON.stringify(features)),
        upsertSetting("cms.om_oss", omOss),
        ...(faqJson.trim() ? [upsertSetting("cms.faq", faqJson)] : []),
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms_settings"] });
      toast.success("Innhold lagret");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function addFeature() {
    setFeatures((f) => [...f, { icon: "zap", title: "", description: "" }]);
  }

  function updateFeature(i: number, field: keyof Feature, value: string) {
    setFeatures((f) => f.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  function removeFeature(i: number) {
    setFeatures((f) => f.filter((_, idx) => idx !== i));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CMS — Nettside</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Rediger innholdet på den offentlige nettsiden</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Lagre
        </Button>
      </div>

      {/* Hero */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Hero-seksjon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Overskrift</Label>
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Stor, fengende overskrift"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Underoverskrift</Label>
            <Textarea
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              rows={3}
              placeholder="Kort beskrivelse av produktet"
            />
          </div>
          <div className="space-y-1.5">
            <Label>CTA-knapp tekst</Label>
            <Input
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="Start gratis prøveperiode"
            />
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Funksjoner / fordeler</CardTitle>
            <Button variant="outline" size="sm" onClick={addFeature} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Legg til
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {features.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Ingen funksjoner ennå. Klikk "Legg til".</p>
          )}
          {features.map((f, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr_1fr_32px] gap-2 items-start">
              <div className="space-y-1">
                <Label className="text-[11px]">Ikon</Label>
                <Input
                  value={f.icon}
                  onChange={(e) => updateFeature(i, "icon", e.target.value)}
                  placeholder="zap"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Tittel</Label>
                <Input
                  value={f.title}
                  onChange={(e) => updateFeature(i, "title", e.target.value)}
                  placeholder="Jobbstyring"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Beskrivelse</Label>
                <Input
                  value={f.description}
                  onChange={(e) => updateFeature(i, "description", e.target.value)}
                  placeholder="Kort beskrivelse..."
                  className="h-8 text-xs"
                />
              </div>
              <button
                onClick={() => removeFeature(i)}
                className="mt-6 p-1 hover:text-destructive transition-colors text-muted-foreground"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">
            Ikonnavn fra Lucide: zap, users, calendar, shield, briefcase, clock, file-text, o.l.
          </p>
        </CardContent>
      </Card>

      {/* Om oss */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Om oss-tekst</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={omOss}
            onChange={(e) => setOmOss(e.target.value)}
            rows={5}
            placeholder="Skriv en tekst om selskapet..."
          />
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">FAQ — Vanlige spørsmål</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFaqJson("");
                setFaqError(null);
              }}
              className="text-xs gap-1"
            >
              Tøm (bruk statisk innhold)
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Lim inn JSON-strukturen for FAQ. Tomt felt bruker standardinnholdet.{" "}
            Format: <code className="font-mono bg-muted px-1 rounded">{"{ \"Kategori\": [{ \"q\": \"...\", \"a\": \"...\" }] }"}</code>
          </p>
          <Textarea
            value={faqJson}
            onChange={(e) => {
              setFaqJson(e.target.value);
              if (e.target.value.trim()) {
                try { JSON.parse(e.target.value); setFaqError(null); } catch { setFaqError("Ugyldig JSON"); }
              } else {
                setFaqError(null);
              }
            }}
            rows={10}
            placeholder={'{\n  "Kom i gang": [\n    { "q": "Spørsmål?", "a": "Svar." }\n  ]\n}'}
            className="font-mono text-xs"
          />
          {faqError && <p className="text-xs text-destructive">{faqError}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Lagre innhold
        </Button>
      </div>
    </div>
  );
}
