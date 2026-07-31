"use client";
import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, Mail, Phone, Globe, MapPin, Users, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { toast, Toaster } from "sonner";
import { ContactFormModal } from "@/components/features/contacts/ContactFormModal";

export default function CompanyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { activeOrgId } = useAppStore();

  const [company, setCompany] = useState<any>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [customFieldDefs, setCustomFieldDefinitions] = useState<any[]>([]);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);

  useEffect(() => {
    if (activeOrgId && id) fetchData();
  }, [activeOrgId, id]);

  const fetchData = async () => {
    // 1. Fetch Company
    const { data: comp } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .eq("org_id", activeOrgId)
      .single();

    if (comp) setCompany(comp);
    else {
      toast.error("Company not found.");
      router.push("/contacts");
      return;
    }

    // 2. Fetch Linked People
    const { data: contacts } = await supabase
      .from("contacts")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false });

    if (contacts) setPeople(contacts);

    // 3. Fetch Custom Field Definitions for Companies
    const { data: defs } = await supabase
      .from("custom_field_definitions")
      .select("*")
      .eq("org_id", activeOrgId)
      .eq("target_type", "company");

    if (defs) setCustomFieldDefinitions(defs);
  };

  if (!company) return (
    <AppLayout>
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-berry border-t-transparent rounded-full" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto flex-1 w-full max-w-full overflow-x-hidden">
        <button onClick={() => router.push('/contacts')} className="flex items-center gap-1 text-sm mb-6 text-slate font-body hover:text-ink transition-colors">
          <ChevronLeft size={15} /> Back to Directory
        </button>

        {/* Company Header */}
        <div className="flex items-start gap-4 mb-8 flex-wrap justify-between border-b border-line pb-8">
          <div className="flex items-start gap-4 flex-1 min-w-[250px]">
            <div className="w-16 h-16 rounded-2xl bg-paperDim border border-line flex items-center justify-center text-ink font-display font-bold text-2xl shadow-sm">
              {company.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-display text-[34px] text-ink leading-tight">{company.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate font-body flex-wrap">
                {company.website && (
                  <a href={company.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-berry hover:underline">
                    <Globe size={14} /> {company.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {company.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone size={14} /> {company.phone}
                  </span>
                )}
                {(company.address_city || company.address_state) && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {company.address_city}, {company.address_state}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button icon={Plus} onClick={() => setIsAddContactOpen(true)}>Add Person to Clinic</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Company Sidebar Details */}
          <div className="space-y-6">
            <div className="rounded-xl p-5 bg-white border border-line shadow-sm">
              <div className="text-xs uppercase mb-4 text-slate tracking-[0.06em] font-body font-medium">Clinic Information</div>
              <div className="space-y-3 text-sm font-body">
                <div>
                  <span className="text-slate block text-xs">Office Line</span>
                  <span className="text-ink font-mono font-medium">{company.phone || "—"}</span>
                </div>
                <div>
                  <span className="text-slate block text-xs">Street Address</span>
                  <span className="text-ink font-medium">{company.address_street || "—"}</span>
                </div>
                <div>
                  <span className="text-slate block text-xs">City, State, Zip</span>
                  <span className="text-ink font-medium">{company.address_city || "—"}, {company.address_state || ""} {company.address_zip || ""}</span>
                </div>

                {customFieldDefs.length > 0 && (
                  <div className="border-t border-line/60 pt-3 mt-3 space-y-2">
                    <div className="text-xs uppercase text-slate tracking-wide font-semibold">Custom Clinic Data</div>
                    {customFieldDefs.map(def => (
                      <div key={def.id}>
                        <span className="text-slate block text-xs">{def.name}</span>
                        <span className="text-ink font-medium">{company.custom_fields?.[def.key] || "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Linked People Section */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-ink font-body flex items-center gap-2">
                <Users size={18} className="text-berry" />
                <span>Associated People & Staff ({people.length})</span>
              </h2>
            </div>

            <div className="rounded-xl overflow-hidden border border-line bg-white shadow-sm">
              <table className="w-full text-sm font-body">
                <thead className="bg-paperDim border-b border-line">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs uppercase text-slate tracking-[0.05em]">Name</th>
                    <th className="text-left px-5 py-3 text-xs uppercase text-slate tracking-[0.05em]">Position</th>
                    <th className="text-left px-5 py-3 text-xs uppercase text-slate tracking-[0.05em]">Contact</th>
                    <th className="text-left px-5 py-3 text-xs uppercase text-slate tracking-[0.05em]">Stage</th>
                    <th className="text-right px-5 py-3 text-xs uppercase text-slate tracking-[0.05em]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((person) => (
                    <tr 
                      key={person.id} 
                      onClick={() => router.push(`/contacts/${person.id}`)}
                      className="border-b border-line hover:bg-paperDim/50 transition-colors cursor-pointer last:border-b-0"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={`${person.first_name} ${person.last_name}`} size={28} />
                          <span className="text-ink font-medium">{person.first_name} {person.last_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate">{person.position || "—"}</td>
                      <td className="px-5 py-3 text-slate font-mono text-xs">
                        {person.email || person.phone || "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="slate">{person.stage || "New Lead"}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); router.push(`/inbox`); }} 
                          className="p-1.5 text-slate hover:text-berry rounded-lg hover:bg-berrySoft/50 transition-colors"
                        >
                          <Mail size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {people.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate font-body">
                        No doctors or staff linked to this clinic yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ContactFormModal 
        isOpen={isAddContactOpen} 
        onClose={() => setIsAddContactOpen(false)} 
        onSuccess={fetchData} 
      />
      <Toaster position="top-right" richColors />
    </AppLayout>
  );
}