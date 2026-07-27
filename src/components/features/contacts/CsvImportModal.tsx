"use client";
import React, { useState } from "react";
import Papa from "papaparse";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Upload, ArrowRight, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import { slugifyFieldKey } from "@/lib/utils";

type Step = "UPLOAD" | "MAP" | "IMPORTING";

// Clean name splitter helper
function splitFullName(fullName: string) {
  let clean = fullName.trim();
  clean = clean.replace(/^(dr\.|mr\.|mrs\.|ms\.|prof\.|doctor)\s+/i, "");
  const parts = clean.split(/\s+/);
  const firstName = parts[0] || "Unknown";
  const lastName = parts.slice(1).join(" ") || "Contact";
  return { firstName, lastName };
}

export function CsvImportModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const supabase = createClient();
  const { activeOrgId } = useAppStore();
  
  const [step, setStep] = useState<Step>("UPLOAD");
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  
  const [personCustomDefs, setPersonCustomDefs] = useState<any[]>([]);
  const [companyCustomDefs, setCompanyCustomDefs] = useState<any[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const fetchDefinitionsAndMemory = async () => {
    if (!activeOrgId) return { memory: {}, defsPerson: [], defsCompany: [] };

    // 1. Fetch Custom Field Definitions
    const { data: defs } = await supabase
      .from("custom_field_definitions")
      .select("key, name, target_type")
      .eq("org_id", activeOrgId);

    const personDefs = defs?.filter(d => d.target_type === 'contact') || [];
    const companyDefs = defs?.filter(d => d.target_type === 'company') || [];
    
    setPersonCustomDefs(personDefs);
    setCompanyCustomDefs(companyDefs);

    // 2. Fetch Mapping Memory
    const { data: memoryRows } = await supabase
      .from("import_field_mappings")
      .select("raw_header, target_mapping")
      .eq("org_id", activeOrgId);

    const memoryMap: Record<string, string> = {};
    memoryRows?.forEach(m => { memoryMap[m.raw_header] = m.target_mapping; });

    return { memory: memoryMap, defsPerson: personDefs, defsCompany: companyDefs };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !activeOrgId) return;
    
    setFile(selectedFile);

    const { memory } = await fetchDefinitionsAndMemory();

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          const extractedHeaders = Object.keys(results.data[0] as object);
          setHeaders(extractedHeaders);
          setCsvData(results.data);
          
          // INTELLIGENT FUZZY MAPPING WITH MEMORY & PREFIX SENSING
          const initialMap: Record<string, string> = {};
          
          extractedHeaders.forEach(h => {
            // Check memory first!
            if (memory[h]) {
              initialMap[h] = memory[h];
              return;
            }

            const cleanHeader = slugifyFieldKey(h);
            const lowerHeader = h.toLowerCase();

            // Check Company Prefixes
            if (cleanHeader.startsWith("company") || cleanHeader.startsWith("clinic") || cleanHeader.startsWith("business")) {
              if (cleanHeader.includes("name") || cleanHeader.includes("title")) initialMap[h] = "company:name";
              else if (cleanHeader.includes("website") || cleanHeader.includes("site") || cleanHeader.includes("url")) initialMap[h] = "company:website";
              else if (cleanHeader.includes("phone") || cleanHeader.includes("tel") || cleanHeader.includes("number") || cleanHeader.includes("office")) initialMap[h] = "company:phone";
              else if (cleanHeader.includes("street") || cleanHeader.includes("address")) initialMap[h] = "company:address_street";
              else if (cleanHeader.includes("city")) initialMap[h] = "company:address_city";
              else if (cleanHeader.includes("state")) initialMap[h] = "company:address_state";
              else if (cleanHeader.includes("zip")) initialMap[h] = "company:address_zip";
              else if (cleanHeader.includes("linkedin")) initialMap[h] = "company:social_linkedin";
              else initialMap[h] = `custom:company:${cleanHeader.replace(/^(company|clinic|business)_?/, "")}`;
              return;
            }

            // Check Person / General Synonyms
            if (["firstname", "fname", "first", "givenname"].includes(cleanHeader)) initialMap[h] = "person:first_name";
            else if (["lastname", "lname", "last", "surname"].includes(cleanHeader)) initialMap[h] = "person:last_name";
            else if (["fullname", "name", "contactname", "personname", "clientname"].includes(cleanHeader)) initialMap[h] = "person:full_name";
            else if (["email", "mail", "emailaddress"].includes(cleanHeader)) initialMap[h] = "person:email";
            else if (["mobilenumber", "mobile", "cell", "cellphone", "personalphone", "phone"].includes(cleanHeader)) initialMap[h] = "person:phone";
            else if (["secondaryphone", "workphone", "officeline", "workline", "altphone"].includes(cleanHeader)) initialMap[h] = "person:secondary_phone";
            else if (["position", "title", "jobtitle", "role"].includes(cleanHeader)) initialMap[h] = "person:position";
            else if (["company", "companyname", "clinic", "clinicname", "business"].includes(cleanHeader)) initialMap[h] = "company:name";
            else if (["website", "companywebsite", "url", "site"].includes(cleanHeader)) initialMap[h] = "company:website";
            else if (["linkedin", "linkedinurl", "profile"].includes(cleanHeader)) initialMap[h] = "person:social_linkedin";
            else if (["stage", "dealstage"].includes(cleanHeader)) initialMap[h] = "person:stage";
            else initialMap[h] = `custom:person:${cleanHeader}`;
          });

          setFieldMap(initialMap);
          setStep("MAP");
        }
      }
    });
  };

  const handleDropdownChange = async (header: string, value: string) => {
    if (value === "action:create_person_field" || value === "action:create_company_field") {
      const targetType = value === "action:create_person_field" ? "contact" : "company";
      const targetLabel = targetType === "contact" ? "Person" : "Company";
      
      const fieldName = window.prompt(`Enter New ${targetLabel} Custom Field Name:`, header);
      if (!fieldName || !activeOrgId) return;

      const cleanKey = slugifyFieldKey(fieldName);

      // Upsert Custom Field Definition
      const { data: newDef, error } = await supabase.from("custom_field_definitions").upsert({
        org_id: activeOrgId,
        target_type: targetType,
        name: fieldName,
        key: cleanKey
      }, { onConflict: 'org_id, target_type, key' }).select("key, name, target_type").single();

      if (error) {
        toast.error("Failed to register custom field.");
      } else if (newDef) {
        toast.success(`Registered '${fieldName}' for ${targetLabel}s.`);
        await fetchDefinitionsAndMemory();
        const targetPrefix = targetType === 'contact' ? 'custom:person:' : 'custom:company:';
        setFieldMap(prev => ({ ...prev, [header]: `${targetPrefix}${newDef.key}` }));
      }
    } else {
      setFieldMap(prev => ({ ...prev, [header]: value }));
    }
  };

  const poolCompanyData = async (companyName: string, companyFields: any) => {
    if (!companyName.trim() || !activeOrgId) return null;

    const trimmedName = companyName.trim();

    // Check if Company already exists
    const { data: existing } = await supabase
      .from("companies")
      .select("*")
      .eq("org_id", activeOrgId)
      .ilike("name", trimmedName)
      .maybeSingle();

    if (existing) {
      // DATA POOLING: Merge new details into existing company without overwriting existing data with empty strings!
      const updatePayload: any = {};
      if (companyFields.website && !existing.website) updatePayload.website = companyFields.website;
      if (companyFields.phone && !existing.phone) updatePayload.phone = companyFields.phone;
      if (companyFields.address_street && !existing.address_street) updatePayload.address_street = companyFields.address_street;
      if (companyFields.address_city && !existing.address_city) updatePayload.address_city = companyFields.address_city;
      if (companyFields.address_state && !existing.address_state) updatePayload.address_state = companyFields.address_state;
      if (companyFields.address_zip && !existing.address_zip) updatePayload.address_zip = companyFields.address_zip;

      if (companyFields.socials && Object.keys(companyFields.socials).length > 0) {
        updatePayload.socials = { ...(existing.socials || {}), ...companyFields.socials };
      }

      if (companyFields.custom_fields && Object.keys(companyFields.custom_fields).length > 0) {
        updatePayload.custom_fields = { ...(existing.custom_fields || {}), ...companyFields.custom_fields };
      }

      if (Object.keys(updatePayload).length > 0) {
        await supabase.from("companies").update(updatePayload).eq("id", existing.id);
      }
      return existing.id;
    } else {
      // Create brand new Company
      const { data: newComp } = await supabase.from("companies").insert({
        org_id: activeOrgId,
        name: trimmedName,
        website: companyFields.website || null,
        phone: companyFields.phone || null,
        address_street: companyFields.address_street || null,
        address_city: companyFields.address_city || null,
        address_state: companyFields.address_state || null,
        address_zip: companyFields.address_zip || null,
        socials: companyFields.socials || {},
        custom_fields: companyFields.custom_fields || {}
      }).select("id").single();

      return newComp?.id || null;
    }
  };

  const executeImport = async () => {
    if (!activeOrgId) return;
    setStep("IMPORTING");
    setProgress({ current: 0, total: csvData.length });

    // Save Mapping Memory across the Workspace
    const memoryPayload = Object.entries(fieldMap).map(([raw_header, target_mapping]) => ({
      org_id: activeOrgId,
      raw_header,
      target_mapping
    }));
    await supabase.from("import_field_mappings").upsert(memoryPayload, { onConflict: "org_id, raw_header" });

    let successCount = 0;

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      
      const personData: any = { org_id: activeOrgId, type: "lead", socials: {}, custom_fields: {} };
      const companyData: any = { socials: {}, custom_fields: {} };
      let companyName = "";

      headers.forEach(header => {
        const target = fieldMap[header];
        if (!target || target === "skip") return;

        const val = row[header];
        if (!val || !val.trim()) return;

        if (target.startsWith("person:")) {
          const field = target.replace("person:", "");
          if (field === "full_name") {
            const { firstName, lastName } = splitFullName(val);
            personData.first_name = firstName;
            personData.last_name = lastName;
          } else if (field === "social_linkedin") {
            personData.socials.linkedin = val;
          } else {
            personData[field] = val;
          }
        } else if (target.startsWith("company:")) {
          const field = target.replace("company:", "");
          if (field === "name") companyName = val;
          else if (field === "social_linkedin") companyData.socials.linkedin = val;
          else companyData[field] = val;
        } else if (target.startsWith("custom:person:")) {
          const key = target.replace("custom:person:", "");
          personData.custom_fields[key] = val;
        } else if (target.startsWith("custom:company:")) {
          const key = target.replace("custom:company:", "");
          companyData.custom_fields[key] = val;
        }
      });

      // Pass 1: Pool & Upsert Company
      let companyId = null;
      if (companyName) {
        companyId = await poolCompanyData(companyName, companyData);
      }

      // Pass 2: Upsert Contact with linked company_id
      personData.company_id = companyId;
      personData.first_name = personData.first_name || "Unknown";
      personData.last_name = personData.last_name || "Contact";
      personData.stage = personData.stage || "New Lead";

      if (personData.email || personData.phone) {
        const { error } = await supabase
          .from("contacts")
          .upsert(personData, { onConflict: 'org_id, email', ignoreDuplicates: false });
        if (!error) successCount++;
      }

      setProgress({ current: i + 1, total: csvData.length });
    }

    toast.success(`Import complete! Processed ${successCount} records and pooled clinic profile data.`);

    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setStep("UPLOAD");
    onSuccess();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { if(step !== "IMPORTING") onClose(); }} title="B2B Relationship Import Engine">
      
      {step === "UPLOAD" && (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-line rounded-xl p-8 bg-paperDim text-center">
          <Upload size={32} className="text-slate mb-3" />
          <p className="text-sm text-ink font-medium mb-1">Select B2B Client / Clinic CSV</p>
          <p className="text-xs text-slate mb-4 font-body max-w-sm">
            Auto-detects Clinic vs Person fields, splits doctor titles, and remembers past mappings.
          </p>
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-xs text-slate file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-ink file:text-paper hover:file:bg-inkSoft cursor-pointer"
          />
        </div>
      )}

      {step === "MAP" && (
        <div className="flex flex-col max-h-[60dvh]">
          <div className="mb-4 p-3 rounded-lg bg-sageSoft text-sage font-medium text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle2 size={16} className="flex-shrink-0" /> Decoded {csvData.length} rows. Confirm mapped entities below:
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
                <ArrowRight size={14} className="hidden sm:block text-slate flex-shrink-0" />
                
                <div className="flex items-center gap-2 flex-1 w-full">
                  <select
                    value={fieldMap[header] || "skip"}
                    onChange={(e) => handleDropdownChange(header, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md text-sm outline-none bg-paperDim font-body text-ink border border-transparent focus:border-berry transition-all cursor-pointer"
                  >
                    <option value="skip">-- Skip this column --</option>
                    
                    <optgroup label="Person / Contact Fields">
                      <option value="person:first_name">Person: First Name</option>
                      <option value="person:last_name">Person: Last Name</option>
                      <option value="person:full_name">Person: Full Name (Auto-Split)</option>
                      <option value="person:email">Person: Primary Email</option>
                      <option value="person:phone">Person: Mobile Phone</option>
                      <option value="person:secondary_phone">Person: Secondary / Work Phone</option>
                      <option value="person:position">Person: Position / Job Title</option>
                      <option value="person:social_linkedin">Person: LinkedIn Profile</option>
                      <option value="person:stage">Person: Pipeline Stage</option>
                    </optgroup>

                    <optgroup label="Company / Clinic Fields">
                      <option value="company:name">Company: Name / Practice Title</option>
                      <option value="company:website">Company: Website URL</option>
                      <option value="company:phone">Company: Office Line</option>
                      <option value="company:address_street">Company: Street Address</option>
                      <option value="company:address_city">Company: City</option>
                      <option value="company:address_state">Company: State</option>
                      <option value="company:address_zip">Company: Zip Code</option>
                      <option value="company:social_linkedin">Company: LinkedIn Page</option>
                    </optgroup>

                    {personCustomDefs.length > 0 && (
                      <optgroup label="Registered Person Custom Fields">
                        {personCustomDefs.map(cf => (
                          <option key={`p_${cf.key}`} value={`custom:person:${cf.key}`}>Person Custom: {cf.name}</option>
                        ))}
                      </optgroup>
                    )}

                    {companyCustomDefs.length > 0 && (
                      <optgroup label="Registered Company Custom Fields">
                        {companyCustomDefs.map(cf => (
                          <option key={`c_${cf.key}`} value={`custom:company:${cf.key}`}>Company Custom: {cf.name}</option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="Create New Custom Field">
                      <option value="action:create_person_field">➕ Create New Person Field...</option>
                      <option value="action:create_company_field">➕ Create New Company Field...</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-line mt-4">
            <Button type="button" variant="ghost" onClick={() => setStep("UPLOAD")}>Back</Button>
            <Button onClick={executeImport}>Run Import & Learn Preferences</Button>
          </div>
        </div>
      )}

      {step === "IMPORTING" && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-8 h-8 border-4 border-berry border-t-transparent rounded-full animate-spin mb-4" />
          <h3 className="text-lg font-medium text-ink font-body">Importing & Pooling Data...</h3>
          <p className="text-sm text-slate mt-2 font-mono">{progress.current} / {progress.total} rows processed.</p>
          <p className="text-xs text-slate mt-4 italic">Merging clinic profiles and saving contact records...</p>
        </div>
      )}
    </Modal>
  );
}