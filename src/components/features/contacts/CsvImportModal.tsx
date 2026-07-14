"use client";
import React, { useState } from "react";
import Papa from "papaparse";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Upload, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

type Step = "UPLOAD" | "MAP" | "IMPORTING";

// System fields we natively support
const STANDARD_FIELDS = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email Address" },
  { key: "phone", label: "Phone Number" },
  { key: "stage", label: "Pipeline Stage" },
];

export function CsvImportModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const supabase = createClient();
  const { activeOrgId } = useAppStore();
  
  const [step, setStep] = useState<Step>("UPLOAD");
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  // Maps CSV Header -> DB Column (or "custom:fieldName")
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          const extractedHeaders = Object.keys(results.data[0] as object);
          setHeaders(extractedHeaders);
          setCsvData(results.data);
          
          // Auto-guess mapping based on exact string matches
          const initialMap: Record<string, string> = {};
          extractedHeaders.forEach(h => {
            const match = STANDARD_FIELDS.find(sf => sf.key.replace("_", "").toLowerCase() === h.replace(/[\s_]/g, "").toLowerCase());
            initialMap[h] = match ? match.key : `custom:${h}`; // Default unknown columns to custom JSONB
          });
          setFieldMap(initialMap);
          setStep("MAP");
        }
      }
    });
  };

  const executeImport = async () => {
    if (!activeOrgId) return;
    setStep("IMPORTING");

    const payload = csvData.map((row) => {
      const contactRecord: any = {
        org_id: activeOrgId,
        type: "lead",
        custom_fields: {}
      };

      headers.forEach(header => {
        const target = fieldMap[header];
        if (!target || target === "skip") return;

        const value = row[header];

        if (target.startsWith("custom:")) {
          const customKey = target.replace("custom:", "");
          contactRecord.custom_fields[customKey] = value;
        } else {
          contactRecord[target] = value;
        }
      });

      // Enforce NOT NULL constraints safely
      contactRecord.first_name = contactRecord.first_name || "Unknown";
      contactRecord.last_name = contactRecord.last_name || "Contact";
      contactRecord.stage = contactRecord.stage || "New Lead";
      
      return contactRecord;
    });

    // Chunk inserts to prevent massive payload rejections
    const chunkSize = 100;
    let errorCount = 0;

    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize);
      const { error } = await supabase.from("contacts").insert(chunk);
      if (error) errorCount++;
    }

    if (errorCount > 0) {
      toast.error(`Import completed with ${errorCount} batch errors.`);
    } else {
      toast.success(`Successfully imported ${payload.length} contacts.`);
    }

    // Reset and close
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setStep("UPLOAD");
    onSuccess();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { if(step !== "IMPORTING") onClose(); }} title="Import Contacts Wizard">
      
      {step === "UPLOAD" && (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-line rounded-xl p-8 bg-paperDim text-center">
          <Upload size={32} className="text-slate mb-3" />
          <p className="text-sm text-ink font-medium mb-1">Select a CSV file to map</p>
          <p className="text-xs text-slate mb-4">You will map columns in the next step.</p>
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-xs text-slate file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-ink file:text-paper hover:file:bg-inkSoft cursor-pointer"
          />
        </div>
      )}

      {step === "MAP" && (
        <div className="flex flex-col max-h-[60vh]">
          <div className="mb-4 p-3 rounded-lg bg-sageSoft text-sage font-medium text-sm flex items-center gap-2">
            <CheckCircle2 size={16} /> Found {csvData.length} rows. Map your columns below.
          </div>
          
          <div className="overflow-y-auto flex-1 pr-2 space-y-3">
            {headers.map(header => (
              <div key={header} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-line bg-white shadow-sm gap-3">
                <div className="flex-1 text-sm font-medium text-ink truncate font-mono">
                  {header}
                  <div className="text-[10px] text-slate font-body truncate mt-1">
                    Example: {csvData[0][header] || "—"}
                  </div>
                </div>
                <ArrowRight size={14} className="hidden sm:block text-slate" />
                <select
                  value={fieldMap[header]}
                  onChange={(e) => setFieldMap(prev => ({ ...prev, [header]: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-md text-sm outline-none bg-paperDim font-body text-ink border border-transparent focus:border-berry transition-all"
                >
                  <option value="skip">-- Skip this column --</option>
                  <optgroup label="Standard Fields">
                    {STANDARD_FIELDS.map(sf => (
                      <option key={sf.key} value={sf.key}>{sf.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Custom Data">
                    <option value={`custom:${header}`}>Save as Custom Field: '{header}'</option>
                  </optgroup>
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-line mt-4">
            <Button type="button" variant="ghost" onClick={() => setStep("UPLOAD")}>Back</Button>
            <Button onClick={executeImport}>Run Import</Button>
          </div>
        </div>
      )}

      {step === "IMPORTING" && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-8 h-8 border-4 border-berry border-t-transparent rounded-full animate-spin mb-4" />
          <h3 className="text-lg font-medium text-ink font-body">Importing {csvData.length} contacts...</h3>
          <p className="text-sm text-slate mt-2">Please do not close this window.</p>
        </div>
      )}
    </Modal>
  );
}