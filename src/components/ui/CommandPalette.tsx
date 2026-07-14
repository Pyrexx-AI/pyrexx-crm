"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Building2, Columns, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { Badge } from "@/components/ui/Badge";

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ type: string; id: string; title: string; subtitle: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();
  const { activeOrgId, currentWorkspace } = useAppStore();

  // 1. Listen for Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 2. Perform Global Search
  useEffect(() => {
    if (!query.trim() || !activeOrgId) {
      setResults([]);
      return;
    }

    const searchDb = async () => {
      setIsLoading(true);
      const searchQ = query.trim();
      let combinedResults: any[] = [];

      // A. Search Contacts (using the tsvector built in Phase 1)
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email")
        .eq("org_id", activeOrgId)
        .textSearch("search_vector", searchQ, { type: 'websearch', config: 'english' })
        .limit(5);

      if (contacts) {
        combinedResults.push(...contacts.map(c => ({
          type: "Contact",
          id: c.id,
          title: `${c.first_name} ${c.last_name}`,
          subtitle: c.email || "No email"
        })));
      }

      // B. Search Deals (ilike match on name)
      const { data: deals } = await supabase
        .from("deals")
        .select("id, name, stage")
        .eq("org_id", activeOrgId)
        .ilike("name", `%${searchQ}%`)
        .limit(3);

      if (deals) {
        combinedResults.push(...deals.map(d => ({
          type: "Deal",
          id: "pipeline", // Routes to pipeline board for now
          title: d.name,
          subtitle: `Stage: ${d.stage}`
        })));
      }

      // C. Search Sub-Accounts (Only if Agency Workspace)
      if (currentWorkspace === "agency") {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name, slug")
          .eq("type", "clinic")
          .ilike("name", `%${searchQ}%`)
          .limit(3);

        if (orgs) {
          combinedResults.push(...orgs.map(o => ({
            type: "Account",
            id: o.id,
            title: o.name,
            subtitle: `${o.slug}@app.pyrexxai.com`
          })));
        }
      }

      setResults(combinedResults);
      setIsLoading(false);
    };

    const debounceId = setTimeout(searchDb, 300);
    return () => clearTimeout(debounceId);
  }, [query, activeOrgId, currentWorkspace, supabase]);

  const handleSelect = (result: any) => {
    setIsOpen(false);
    setQuery("");
    
    if (result.type === "Contact") router.push(`/contacts/${result.id}`);
    if (result.type === "Deal") router.push(`/pipeline`);
    if (result.type === "Account") router.push(`/accounts`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 pb-4 px-4 bg-ink/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-line flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-line bg-paperDim/30">
          <Search size={18} className="text-slate flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts, deals, or accounts..."
            className="w-full bg-transparent border-none outline-none px-4 py-4 text-ink font-body placeholder:text-slate"
          />
          <button onClick={() => setIsOpen(false)} className="p-1 text-slate hover:text-ink transition-colors rounded">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim() === "" ? (
            <div className="p-8 text-center text-sm text-slate font-body">
              Start typing to search globally...
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}-${i}`}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-paperDim transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-line flex items-center justify-center text-slate group-hover:text-berry group-hover:border-berrySoft transition-colors">
                      {r.type === "Contact" && <User size={14} />}
                      {r.type === "Deal" && <Columns size={14} />}
                      {r.type === "Account" && <Building2 size={14} />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-ink font-body">{r.title}</div>
                      <div className="text-xs text-slate font-body">{r.subtitle}</div>
                    </div>
                  </div>
                  <Badge variant="slate" className="opacity-60 group-hover:opacity-100">{r.type}</Badge>
                </button>
              ))}
            </div>
          ) : isLoading ? (
             <div className="p-8 text-center text-sm text-slate font-body">Searching...</div>
          ) : (
             <div className="p-8 text-center text-sm text-slate font-body">No results found for "{query}"</div>
          )}
        </div>
      </div>
    </div>
  );
}