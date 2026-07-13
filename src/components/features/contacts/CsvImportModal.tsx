"use client";
import React, { useState } from "react";
import Papa from "papaparse";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Upload, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

export function CsvImportModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const supabase = createClient();
  const { activeOrgId } = useAppStore();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = () => {
    if (!file || !activeOrgId) return;
    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const payload = rows.map(row => ({
          org_id: activeOrgId,
          first_name: row.first_name || row.firstName || "Unknown",
          last_name: row.last_name || row.lastName || "Contact",
          email: row.email || null,
          phone: row.phone || null,
          type: "lead",
          stage: "New Lead"
        }));

        const { error } = await supabase.from("contacts").insert(payload);
        setIsUploading(false);

        if (error) {
          toast.error("Import failed", { description: error.message });
        } else {
          toast.success(`Successfully imported ${payload.length} contacts.`);
          setFile(null);
          onSuccess();
          onClose();
        }
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Contacts">
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-line rounded-xl p-8 mb-4 bg-paperDim text-center">
        <Upload size={32} className="text-slate mb-3" />
        <p className="text-sm text-ink font-medium mb-1">Upload a CSV file</p>
        <p className="text-xs text-slate mb-4">Must include headers: first_name, last_name, email, phone</p>
        <input 
          type="file" 
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-xs text-slate file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-ink file:text-paper hover:file:bg-inkSoft"
        />
      </div>

      {file && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-sageSoft text-sage text-sm font-medium mb-4">
          <AlertCircle size={16} />
          Ready to import: {file.name}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-line">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleUpload} disabled={!file || isUploading}>
          {isUploading ? "Importing..." : "Start Import"}
        </Button>
      </div>
    </Modal>
  );
}