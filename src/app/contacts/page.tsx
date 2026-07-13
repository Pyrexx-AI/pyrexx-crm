"use client";
import React, { useState, useEffect } from "react";
import { Plus, Download } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/Button";
import { ContactsTable } from "@/components/features/contacts/ContactsTable";
import { ContactFormModal } from "@/components/features/contacts/ContactFormModal";
import { CsvImportModal } from "@/components/features/contacts/CsvImportModal";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { Toaster } from "sonner"; // Ensures Toasts render

export default function ContactsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const supabase = createClient();
  const { currentWorkspace, activeOrgId } = useAppStore();

  const fetchContacts = async () => {
    if (!activeOrgId) return;

    let query = supabase
      .from("contacts")
      .select("*")
      .eq("org_id", activeOrgId)
      .eq("type", currentWorkspace === "agency" ? "lead" : "patient")
      .order("created_at", { ascending: false });

    // Global Search utilizing the tsvector indexed column created in SQL
    if (searchQuery.trim() !== "") {
      query = query.textSearch("search_vector", searchQuery.trim(), {
        type: 'websearch',
        config: 'english'
      });
    }

    const { data, error } = await query;
    if (!error && data) {
      setContacts(data as any);
    }
  };

  // Debounced Search Effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchContacts();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeOrgId, currentWorkspace]);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <SectionTitle 
          eyebrow={currentWorkspace === "agency" ? "Agency Workspace" : "Clinic Workspace"}
          title={currentWorkspace === "agency" ? "Contacts" : "Patients"} 
          action={
            <div className="flex gap-2">
              <Button variant="outline" icon={Download} onClick={() => setIsImportOpen(true)}>
                Import CSV
              </Button>
              <Button icon={Plus} onClick={() => setIsFormOpen(true)}>
                New {currentWorkspace === "agency" ? "Contact" : "Patient"}
              </Button>
            </div>
          } 
        />

        <ContactsTable 
          data={contacts} 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
        />

        <ContactFormModal 
          isOpen={isFormOpen} 
          onClose={() => setIsFormOpen(false)} 
          onSuccess={fetchContacts}
        />
        
        <CsvImportModal 
          isOpen={isImportOpen} 
          onClose={() => setIsImportOpen(false)} 
          onSuccess={fetchContacts}
        />
      </div>
      <Toaster position="top-right" richColors />
    </AppLayout>
  );
}