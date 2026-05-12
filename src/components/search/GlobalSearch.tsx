import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, User, Briefcase, FileText, TrendingUp, Cpu, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { useGlobalSearch, type SearchCategory } from "@/hooks/useGlobalSearch";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const CATEGORY_CONFIG: Record<SearchCategory, { label: string; icon: typeof Building2 }> = {
  companies:  { label: "Kunder",         icon: Building2  },
  contacts:   { label: "Kontakter",      icon: User       },
  jobs:       { label: "Jobber",         icon: Briefcase  },
  agreements: { label: "Serviceavtaler", icon: FileText   },
  deals:      { label: "Salg",           icon: TrendingUp },
  assets:     { label: "Anlegg",         icon: Cpu        },
};

const CATEGORY_ORDER: SearchCategory[] = [
  "companies", "contacts", "jobs", "agreements", "deals", "assets",
];

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { results, loading } = useGlobalSearch(query);

  const hasResults = CATEGORY_ORDER.some(cat => results[cat].length > 0);
  const showEmpty = query.trim().length >= 2 && !loading && !hasResults;

  // Global Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleOpenChange = useCallback((v: boolean) => {
    setOpen(v);
    if (!v) setQuery("");
  }, []);

  const navigateTo = useCallback((link: string) => {
    navigate(link);
    handleOpenChange(false);
  }, [navigate, handleOpenChange]);

  return (
    <>
      {/* Trigger */}
      {isMobile ? (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <Search className="w-4 h-4" />
        </Button>
      ) : (
        <button
          className="flex items-center gap-2 h-9 w-64 rounded-md bg-muted/50 border border-border px-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
          onClick={() => setOpen(true)}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left text-sm truncate">Søk kontakter, salg...</span>
          <kbd className="hidden sm:inline-flex text-[10px] bg-background border border-border rounded px-1.5 py-0.5 font-mono text-muted-foreground/50 shrink-0">
            ⌘K
          </kbd>
        </button>
      )}

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            "overflow-hidden p-0 gap-0 shadow-2xl",
            isMobile
              ? "!top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-[100dvh] !max-w-none rounded-none"
              : "!top-[18%] !translate-y-0 sm:max-w-xl"
          )}
        >
          <DialogTitle className="sr-only">Globalt søk</DialogTitle>

          <Command shouldFilter={false} className="rounded-none">
            {/* Input row */}
            <div className="flex items-center gap-2 px-4 border-b border-border" cmdk-input-wrapper="">
              {loading
                ? <Loader2 className="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
                : <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              }
              <CommandInput
                placeholder="Søk i alt..."
                value={query}
                onValueChange={setQuery}
                className="border-0 focus:ring-0 px-0"
              />
            </div>

            <CommandList className={cn("max-h-[420px]", isMobile && "max-h-[calc(100dvh-64px)]")}>
              {/* Idle prompt */}
              {query.trim().length < 2 && !loading && (
                <div className="py-10 text-center text-sm text-muted-foreground/50">
                  Skriv minst 2 tegn for å søke
                </div>
              )}

              {/* Empty */}
              {showEmpty && (
                <CommandEmpty>
                  <p className="text-sm font-medium">Ingen treff på «{query}»</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Prøv navn, nummer eller e-post</p>
                </CommandEmpty>
              )}

              {/* Results */}
              {!loading && hasResults && CATEGORY_ORDER.map(cat => {
                const items = results[cat];
                if (!items.length) return null;
                const cfg = CATEGORY_CONFIG[cat];
                const Icon = cfg.icon;

                return (
                  <CommandGroup
                    key={cat}
                    heading={cfg.label}
                    className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/50 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5"
                  >
                    {items.map(item => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => navigateTo(item.link)}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md mx-1"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-foreground">{item.primary}</span>
                          {item.secondary && (
                            <span className="text-xs text-muted-foreground ml-2">{item.secondary}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>

            {/* Footer */}
            {hasResults && (
              <div className="flex items-center gap-3 px-4 py-2 border-t border-border text-[11px] text-muted-foreground/40">
                <span>↑↓ naviger</span>
                <span className="mx-0.5">·</span>
                <span>↵ åpne</span>
                <span className="mx-0.5">·</span>
                <span>esc lukk</span>
              </div>
            )}
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
