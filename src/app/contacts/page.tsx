"use client";
import React, { useState, useEffect } from "react";
import { Plus, Download } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/Button";
import { ContactsTable } from "@/components/features/contacts/ContactsTable";
import { ContactFormModal } from "@/components/features/contacts/ContactFormModal";
import { CsvImportModal } from "@/components/features/contacts/CsvImportModal";
import { DynamicIsland } from "@/components/ui/DynamicIsland";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { Toaster } from "sonner";

export default function ContactsPage() {
  const [viewMode, setViewMode] = useState<"people" | "companies">("people");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [peopleCount, setPeopleCount] = useState(0);
  const [companiesCount, setCompaniesCount] = useState(0);

  const supabase = createClient();
  const { currentWorkspace, activeOrgId } = useAppStore();

  const fetchRecords = async () => {
    if (!activeOrgId) return;
    setIsLoading(true);

    if (viewMode === "people") {
      let query = supabase
        .from("contacts")
        .select("*, companies(id, name)")
        .eq("org_id", activeOrgId)
        .order("created_at", { ascending: false });

      if (searchQuery.trim() !== "") {
        query = query.textSearch("search_vector", searchQuery.trim(), { type: 'websearch', config: 'english' });
      }

      const { data, count } = await query;
      if (data) setRecords(data);
      if (count !== null) setPeopleCount(count);
    } else {
      let query = supabase
        .from("companies")
        .select("*, contacts(id)")
        .eq("org_id", activeOrgId)
        .order("created_at", { ascending: false });

      if (searchQuery.trim() !== "") {
        query = query.ilike("name", `%${searchQuery.trim()}%`);
      }

      const { data, count } = await query;
      if (data) setRecords(data);
      if (count !== null) setCompaniesCount(count);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, [viewMode, searchQuery, activeOrgId, currentWorkspace]);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto flex-1 w-full max-w-full overflow-x-hidden">
        
        {/* Top Floating Dynamic Island Control */}
        <div className="flex justify-center mb-6">
          <DynamicIsland 
            activeTab={viewMode} 
            onTabChange={(tab) => setViewMode(tab)} 
            peopleCount={peopleCount}
            companiesCount={companiesCount}
          />
        </div>

        <SectionTitle 
          eyebrow={currentWorkspace === "agency" ? "Agency Workspace" : "Clinic Workspace"}
          title={viewMode === "people" ? "People & Leads" : "Clinics & Companies"} 
          action={
            <div className="flex gap-2">
              <Button variant="outline" icon={Download} onClick={() => setIsImportOpen(true)}>
                Import CSV
              </Button>
              <Button icon={Plus} onClick={() => setIsFormOpen(true)}>
                New {viewMode === "people" ? "Contact" : "Company"}
              </Button>
            </div>
          } 
        />

        <ContactsTable 
          data={records} 
          viewMode={viewMode}
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          isLoading={isLoading}
        />

        <ContactFormModal 
          isOpen={isFormOpen} 
          onClose={() => setIsFormOpen(false)} 
          onSuccess={fetchRecords}
        />
        
        <CsvImportModal 
          isOpen={isImportOpen} 
          onClose={() => setIsImportOpen(false)} 
          onSuccess={fetchRecords}
        />
      </div>
      <Toaster position="top-right" richColors />
    </AppLayout>
  );
}