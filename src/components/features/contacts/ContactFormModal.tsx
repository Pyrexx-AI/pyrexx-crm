"use client";
import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, Search } from "lucide-react";
import { slugifyFieldKey } from "@/lib/utils";

const contactSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  position: z.string().optional(),
  secondary_phone: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  social_linkedin: z.string().optional(),
  social_twitter: z.string().optional(),
}).refine(data => data.email || data.phone, {
  message: "Provide at least an Email or Phone Number.",
  path: ["email"]
});

type ContactFormValues = z.infer<typeof contactSchema>;

export function ContactFormModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void, onSuccess: () => void }) {
  const supabase = createClient();
  const { activeOrgId } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showClinicDetails, setShowClinicDetails] = useState(false);

  const [personDefs, setPersonDefs] = useState<any[]>([]);
  const [companyDefs, setCompanyDefs] = useState<any[]>([]);
  const [personCustomValues, setPersonCustomValues] = useState<Record<string, string>>({});
  const [companyCustomValues, setCompanyCustomValues] = useState<Record<string, string>>({});
  
  const [clinicQuery, setClinicQuery] = useState("");
  const [clinicSuggestions, setClinicSuggestions] = useState<any[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<any | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [clinicForm, setClinicForm] = useState({ phone: "", website: "", address_street: "", address_city: "", address_state: "", address_zip: "", social_linkedin: "" });

  const suggestRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  const fetchDefinitions = async () => {
    if (!activeOrgId) return;
    const { data: defs } = await supabase
      .from("custom_field_definitions")
      .select("*")
      .eq("org_id", activeOrgId);

    if (defs) {
      setPersonDefs(defs.filter(d => d.target_type === 'contact'));
      setCompanyDefs(defs.filter(d => d.target_type === 'company'));
    }
  };

  useEffect(() => {
    if (isOpen && activeOrgId) fetchDefinitions();
  }, [isOpen, activeOrgId]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleClinicSearch = async (val: string) => {
    setClinicQuery(val);
    setSelectedClinic(null);
    if (!val.trim() || !activeOrgId) {
      setClinicSuggestions([]);
      return;
    }

    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("org_id", activeOrgId)
      .ilike("name", `%${val}%`)
      .limit(5);

    setClinicSuggestions(data || []);
    setShowSuggestions(true);
  };

  const handleSelectClinic = (clinic: any) => {
    setSelectedClinic(clinic);
    setClinicQuery(clinic.name);
    setClinicForm({
      phone: clinic.phone || "",
      website: clinic.website || "",
      address_street: clinic.address_street || "",
      address_city: clinic.address_city || "",
      address_state: clinic.address_state || "",
      address_zip: clinic.address_zip || "",
      social_linkedin: clinic.socials?.linkedin || ""
    });
    setCompanyCustomValues(clinic.custom_fields || {});
    setShowSuggestions(false);
    setShowClinicDetails(true);
  };

  const handleAddCustomField = async (targetType: "contact" | "company") => {
    const label = targetType === "contact" ? "Person Profile" : "Company Profile";
    const name = window.prompt(`Enter New ${label} Field Name:`);
    if (!name || !activeOrgId) return;

    const key = slugifyFieldKey(name);

    const { error } = await supabase.from("custom_field_definitions").upsert({
      org_id: activeOrgId,
      target_type: targetType,
      name,
      key
    }, { onConflict: 'org_id, target_type, key' });

    if (error) {
      toast.error("Failed to add field.");
    } else {
      toast.success(`Added '${name}' custom field.`);
      fetchDefinitions();
    }
  };

  const onSubmit = async (data: ContactFormValues) => {
    if (!activeOrgId) return;
    setIsSubmitting(true);

    try {
      let companyId = selectedClinic?.id || null;

      // 1. Data Pooling for Clinic
      if (clinicQuery.trim() !== "") {
        const { data: existingCompany } = await supabase
          .from("companies")
          .select("id, custom_fields, socials")
          .eq("org_id", activeOrgId)
          .ilike("name", clinicQuery.trim())
          .maybeSingle();

        if (existingCompany) {
          companyId = existingCompany.id;
          // Merge custom fields on company
          const mergedFields = { ...(existingCompany.custom_fields || {}), ...companyCustomValues };
          await supabase.from("companies").update({
            custom_fields: mergedFields
          }).eq("id", companyId);
        } else {
          // Create new company
          const { data: newCompany } = await supabase.from("companies").insert({
            org_id: activeOrgId,
            name: clinicQuery.trim(),
            phone: clinicForm.phone || null,
            website: clinicForm.website || null,
            address_street: clinicForm.address_street || null,
            address_city: clinicForm.address_city || null,
            address_state: clinicForm.address_state || null,
            address_zip: clinicForm.address_zip || null,
            socials: { linkedin: clinicForm.social_linkedin },
            custom_fields: companyCustomValues
          }).select("id").single();

          if (newCompany) companyId = newCompany.id;
        }
      }

      // 2. Create Contact
      const { error: contactError } = await supabase.from("contacts").insert({
        org_id: activeOrgId,
        company_id: companyId,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone: data.phone || null,
        position: data.position || null,
        secondary_phone: data.secondary_phone || null,
        address_street: data.address_street || null,
        address_city: data.address_city || null,
        address_state: data.address_state || null,
        address_zip: data.address_zip || null,
        socials: { linkedin: data.social_linkedin, twitter: data.social_twitter },
        custom_fields: personCustomValues
      });

      if (contactError) toast.error("Failed to save contact.");
      else {
        toast.success("Contact record created.");
        reset();
        setClinicQuery("");
        setSelectedClinic(null);
        setPersonCustomValues({});
        setCompanyCustomValues({});
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Contact Record">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[75dvh] overflow-y-auto pr-2">
        
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" {...register("first_name")} error={errors.first_name?.message} />
          <Input label="Last Name" {...register("last_name")} error={errors.last_name?.message} />
        </div>

        <div className="relative" ref={suggestRef}>
          <Input 
            label="Clinic / Company Name" 
            placeholder="Search existing or type new clinic..."
            value={clinicQuery}
            onChange={(e) => handleClinicSearch(e.target.value)}
          />
          {showSuggestions && clinicSuggestions.length > 0 && (
            <div className="absolute top-[68px] inset-x-0 bg-white border border-line rounded-lg shadow-lg z-50 overflow-hidden">
              {clinicSuggestions.map(cs => (
                <button
                  key={cs.id}
                  type="button"
                  onClick={() => handleSelectClinic(cs)}
                  className="w-full text-left p-3 hover:bg-paperDim flex items-center gap-2 text-sm text-ink border-b border-line last:border-0 font-body"
                >
                  <Search size={14} className="text-slate" />
                  <div>
                    <div className="font-semibold">{cs.name}</div>
                    <div className="text-xs text-slate">{cs.website || cs.phone || "No website/phone"}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Primary Email" type="email" {...register("email")} error={errors.email?.message} />
          <Input label="Mobile Phone" type="tel" {...register("phone")} error={errors.phone?.message} />
        </div>

        {/* SECTION 2: Person Additional Info */}
        <div className="border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setShowContactDetails(!showContactDetails)}
            className="w-full flex items-center justify-between text-xs uppercase tracking-wide text-slate font-medium font-body"
          >
            <span>Additional Person Info</span>
            {showContactDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {showContactDetails && (
            <div className="space-y-4 mt-3">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Position / Role" placeholder="e.g. Lead Doctor" {...register("position")} />
                <Input label="Work Line / Secondary Phone" type="tel" {...register("secondary_phone")} />
              </div>
              <Input label="Street Address" {...register("address_street")} />
              <div className="grid grid-cols-3 gap-3">
                <Input label="City" {...register("address_city")} />
                <Input label="State" {...register("address_state")} />
                <Input label="Zip" {...register("address_zip")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="LinkedIn Profile" placeholder="linkedin.com/in/..." {...register("social_linkedin")} />
                <Input label="Twitter/X" placeholder="x.com/..." {...register("social_twitter")} />
              </div>

              {personDefs.length > 0 && (
                <div className="border-t border-line/50 pt-3 space-y-3">
                  <span className="text-xs text-slate font-semibold font-body">Person Custom Fields</span>
                  {personDefs.map(def => (
                    <Input 
                      key={def.id} 
                      label={def.name} 
                      value={personCustomValues[def.key] || ""} 
                      onChange={(e) => setPersonCustomValues({...personCustomValues, [def.key]: e.target.value})} 
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => handleAddCustomField("contact")}
                className="text-berry text-xs font-semibold flex items-center gap-1 hover:underline mt-2"
              >
                <Plus size={14} /> Add Person Custom Field
              </button>
            </div>
          )}
        </div>

        {/* SECTION 3: Company Additional Info */}
        <div className="border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setShowClinicDetails(!showClinicDetails)}
            className="w-full flex items-center justify-between text-xs uppercase tracking-wide text-slate font-medium font-body"
          >
            <span>Additional Clinic Info</span>
            {showClinicDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {showClinicDetails && (
            <div className="space-y-4 mt-3">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Office Line" value={clinicForm.phone} onChange={(e) => setClinicForm({...clinicForm, phone: e.target.value})} disabled={!!selectedClinic} />
                <Input label="Clinic Website" placeholder="https://..." value={clinicForm.website} onChange={(e) => setClinicForm({...clinicForm, website: e.target.value})} disabled={!!selectedClinic} />
              </div>
              <Input label="Clinic Address" value={clinicForm.address_street} onChange={(e) => setClinicForm({...clinicForm, address_street: e.target.value})} disabled={!!selectedClinic} />
              <div className="grid grid-cols-3 gap-3">
                <Input label="City" value={clinicForm.address_city} onChange={(e) => setClinicForm({...clinicForm, address_city: e.target.value})} disabled={!!selectedClinic} />
                <Input label="State" value={clinicForm.address_state} onChange={(e) => setClinicForm({...clinicForm, address_state: e.target.value})} disabled={!!selectedClinic} />
                <Input label="Zip" value={clinicForm.address_zip} onChange={(e) => setClinicForm({...clinicForm, address_zip: e.target.value})} disabled={!!selectedClinic} />
              </div>

              {companyDefs.length > 0 && (
                <div className="border-t border-line/50 pt-3 space-y-3">
                  <span className="text-xs text-slate font-semibold font-body">Company Custom Fields</span>
                  {companyDefs.map(def => (
                    <Input 
                      key={def.id} 
                      label={def.name} 
                      value={companyCustomValues[def.key] || ""} 
                      onChange={(e) => setCompanyCustomValues({...companyCustomValues, [def.key]: e.target.value})} 
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => handleAddCustomField("company")}
                className="text-berry text-xs font-semibold flex items-center gap-1 hover:underline mt-2"
              >
                <Plus size={14} /> Add Company Custom Field
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-line mt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Create Record"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}