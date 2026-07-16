"use client";
import React, { useState } from "react";
import Papa from "papaparse";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Upload, AlertCircle, ArrowRight, CheckCircle2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

type Step = "UPLOAD" | "MAP" | "IMPORTING";

const STANDARD_FIELDS = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "full_name", label: "Full Name (Auto-Split)" },
  { key: "email", label: "Email Address" },
  { key: "phone", label: "Phone Number" },
  { key: "position", label: "Position / Job Title" },
  { key: "stage", label: "Pipeline Stage" },
];

export function CsvImportModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const supabase = createClient();
  const { activeOrgId } = useAppStore();
  
  const [step, setStep] = useState<Step>("UPLOAD");
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<any[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !activeOrgId) return;
    
    setFile(selectedFile);

    const { data: extFields } = await supabase.from("custom_field_definitions").select("key, name").eq("org_id", activeOrgId).eq("target_type", "contact");
    setCustomFields(extFields || []);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          const extractedHeaders = Object.keys(results.data[0] as object);
          setHeaders(extractedHeaders);
          setCsvData(results.data);
          
          const initialMap: Record<string, string> = {};
          extractedHeaders.forEach(h => {
            const cleanHeader = h.toLowerCase().replace(/[\s_-]/g, "");
            
            if (["firstname", "fname", "first", "givenname"].includes(cleanHeader)) {
              initialMap[h] = "first_name";
            } else if (["lastname", "lname", "last", "surname"].includes(cleanHeader)) {
              initialMap[h] = "last_name";
            } else if (["fullname", "name", "contactname"].includes(cleanHeader)) {
              initialMap[h] = "full_name";
            } else if (["email", "mail", "emailaddress"].includes(cleanHeader)) {
              initialMap[h] = "email";
            } else if (["phone", "mobile", "cell", "tel", "number", "phonenumber"].includes(cleanHeader)) {
              initialMap[h] = "phone";
            } else if (["title", "position", "jobtitle", "role"].includes(cleanHeader)) {
              initialMap[h] = "position";
            } else if (["stage", "dealstage"].includes(cleanHeader)) {
              initialMap[h] = "stage";
            } else {
              initialMap[h] = `custom:${cleanHeader}`;
            }
          });
          setFieldMap(initialMap);
          setStep("MAP");
        }
      }
    });
  };

  const createCustomFieldOnTheFly = async (headerName: string) => {
    if (!activeOrgId) return;
    const cleanKey = headerName.toLowerCase().replace(/[\s-]/g, "_");

    const { data: newDef, error } = await supabase.from("custom_field_definitions").insert({
      org_id: activeOrgId,
      target_type: "contact",
      name: headerName,
      key: cleanKey
    }).select("key, name").single();

    if (error) {
      toast.error("Failed to register custom field.");
    } else if (newDef) {
      setCustomFields(prev => [...prev, newDef]);
      setFieldMap(prev => ({ ...prev, [headerName]: `custom:${newDef.key}` }));
      toast.success(`Registered '${headerName}' as a dynamic field.`);
    }
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
        } else if (target === "full_name" && value) {
          // Robust null check before string splits
          const nameParts = value?.toString().trim().split(/\s+/) || [];
          contactRecord.first_name = nameParts[0] || "Unknown";
          contactRecord.last_name = nameParts.slice(1).join(" ") || "Contact";
        } else {
          contactRecord[target] = value;
        }
      });

      contactRecord.first_name = contactRecord.first_name || "Unknown";
      contactRecord.last_name = contactRecord.last_name || "Contact";
      contactRecord.stage = contactRecord.stage || "New Lead";
      
      return contactRecord;
    });

    const chunkSize = 100;
    let errorCount = 0;

    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize);
      const { error } = await supabase.from("contacts").insert(chunk);
      if (error) errorCount++;
    }

    if (errorCount > 0) {
      toast.error(`Import completed with errors in some batches.`);
    } else {
      toast.success(`Successfully mapped and imported ${payload.length} contacts.`);
    }

    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setStep("UPLOAD");
    onSuccess();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { if(step !== "IMPORTING") onClose(); }} title="Smart Import Wizard">
      {step === "UPLOAD" && (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-line rounded-xl p-8 bg-paperDim text-center">
          <Upload size={32} className="text-slate mb-3" />
          <p className="text-sm text-ink font-medium mb-1">Select your client/lead CSV list</p>
          <p className="text-xs text-slate mb-4">The engine will auto-suggest matches and split full names.</p>
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
            <CheckCircle2 size={16} /> Decoded {csvData.length} records. Confirm the matched fields below:
          </div>
          
          <div className="overflow-y-auto flex-1 pr-2 space-y-3">
            {headers.map(header => (
              <div key={header} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-line bg-white shadow-sm gap-3">
                <div className="flex-1 text-sm font-medium text-ink truncate font-mono">
                  {header}
                  <div className="text-[10px] text-slate font-body truncate mt-1">
                    Preview: {csvData[0][header] || "—"}
                  </div>
                </div>
                <ArrowRight size={14} className="hidden sm:block text-slate" />
                
                <div className="flex items-center gap-2 flex-1 w-full">
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
                    <optgroup label="Custom Profile Data">
                      {customFields.map(cf => (
                        <option key={cf.key} value={`custom:${cf.key}`}>Map to Custom Field: '{cf.name}'</option>
                      ))}
                    </optgroup>
                  </select>
                  
                  {fieldMap[header] === "skip" && (
                    <button 
                      type="button" 
                      onClick={() => createCustomFieldOnTheFly(header)}
                      className="p-2 rounded-md bg-paperDim border border-line text-slate hover:text-berry hover:border-berrySoft transition-all"
                      title="Add as New Custom Field"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-line mt-4">
            <Button type="button" variant="ghost" onClick={() => setStep("UPLOAD")}>Back</Button>
            <Button onClick={executeImport}>Run Import & Split Names</Button>
          </div>
        </div>
      )}

      {step === "IMPORTING" && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-8 h-8 border-4 border-berry border-t-transparent rounded-full animate-spin mb-4" />
          <h3 className="text-lg font-medium text-ink font-body">Importing {csvData.length} contacts...</h3>
          <p className="text-sm text-slate mt-2">Processing CSV rows and saving data safely.</p>
        </div>
      )}
    </Modal>
  );
}