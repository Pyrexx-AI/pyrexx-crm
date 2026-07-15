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

// Standard Schema: Enforces at least email OR phone
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
  message: "You must provide at least an Email or Phone Number.",
  path: ["email"]
});

type ContactFormValues = z.infer<typeof contactSchema>;

export function ContactFormModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void, onSuccess: () => void }) {
  const supabase = createClient();
  const { activeOrgId } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sections collapsing
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showClinicDetails, setShowClinicDetails] = useState(false);

  // Dynamic Custom Fields State
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<any[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  
  // Clinic Auto-Suggest & Prefill
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
    const { data } = await supabase
      .from("custom_field_definitions")
      .select("*")
      .eq("org_id", activeOrgId)
      .eq("target_type", "contact");
    if (data) setCustomFieldDefinitions(data);
  };

  useEffect(() => {
    if (isOpen && activeOrgId) {
      fetchDefinitions();
    }
  }, [isOpen, activeOrgId]);

  // Click outside auto-suggest closer
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Search Clinic suggestions
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
    setShowSuggestions(false);
    setShowClinicDetails(true); // Open section to show prefilled data
  };

  const handleAddCustomField = async () => {
    const name = window.prompt("Enter Custom Field Name (e.g. TikTok Profile):");
    if (!name || !activeOrgId) return;

    const key = name.toLowerCase().replace(/[\s-]/g, "_");

    const { error } = await supabase.from("custom_field_definitions").insert({
      org_id: activeOrgId,
      target_type: "contact",
      name,
      key
    });

    if (error) {
      toast.error("Field already exists or failed to define.");
    } else {
      toast.success(`Custom field '${name}' added successfully.`);
      fetchDefinitions();
    }
  };

  const onSubmit = async (data: ContactFormValues) => {
    if (!activeOrgId) return;
    setIsSubmitting(true);

    try {
      let companyId = selectedClinic?.id || null;

      // 1. If a new Clinic was typed but doesn't exist, create it first
      if (clinicQuery.trim() !== "" && !selectedClinic) {
        const { data: newCompany, error: compError } = await supabase
          .from("companies")
          .insert({
            org_id: activeOrgId,
            name: clinicQuery,
            phone: clinicForm.phone,
            website: clinicForm.website,
            address_street: clinicForm.address_street,
            address_city: clinicForm.address_city,
            address_state: clinicForm.address_state,
            address_zip: clinicForm.address_zip,
            socials: { linkedin: clinicForm.social_linkedin }
          })
          .select("id")
          .single();

        if (!compError && newCompany) {
          companyId = newCompany.id;
        }
      }

      // 2. Insert Contact with associated companyId and custom fields JSON payload
      const socialsObj = { linkedin: data.social_linkedin, twitter: data.social_twitter };

      const { error: contactError } = await supabase.from("contacts").insert({
        org_id: activeOrgId,
        company_id: companyId,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone: data.phone || null,
        position: data.position,
        secondary_phone: data.secondary_phone,
        address_street: data.address_street,
        address_city: data.address_city,
        address_state: data.address_state,
        address_zip: data.address_zip,
        socials: socialsObj,
        custom_fields: customFieldValues
      });

      if (contactError) {
        toast.error("Failed to save contact.");
      } else {
        toast.success("Contact saved successfully.");
        reset();
        setClinicQuery("");
        setSelectedClinic(null);
        setCustomFieldValues({});
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
    <Modal isOpen={isOpen} onClose={onClose} title="New Contact">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
        
        {/* SECTION 1: Core Fields (Always Visible) */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" {...register("first_name")} error={errors.first_name?.message} />
          <Input label="Last Name" {...register("last_name")} error={errors.last_name?.message} />
        </div>

        {/* Dynamic Clinic Field with Suggestions */}
        <div className="relative" ref={suggestRef}>
          <Input 
            label="Clinic / Company Name" 
            placeholder="Type clinic to search or create new..."
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
          <Input label="Primary Phone" type="tel" {...register("phone")} error={errors.phone?.message} />
        </div>

        {/* SECTION 2: Collapsible Additional Contact Details */}
        <div className="border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setShowContactDetails(!showContactDetails)}
            className="w-full flex items-center justify-between text-xs uppercase tracking-wide text-slate font-medium font-body"
          >
            <span>Additional Contact Details</span>
            {showContactDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {showContactDetails && (
            <div className="space-y-4 mt-3">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Position/Job Title" placeholder="e.g. Head Dermatologist" {...register("position")} />
                <Input label="Secondary Phone" type="tel" {...register("secondary_phone")} />
              </div>
              <Input label="Street Address" {...register("address_street")} />
              <div className="grid grid-cols-3 gap-3">
                <Input label="City" {...register("address_city")} />
                <Input label="State" {...register("address_state")} />
                <Input label="Zip" {...register("address_zip")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="LinkedIn URL" placeholder="linkedin.com/in/..." {...register("social_linkedin")} />
                <Input label="Twitter/X URL" placeholder="twitter.com/..." {...register("social_twitter")} />
              </div>

              {/* Render Contact Custom Fields */}
              {customFieldDefinitions.length > 0 && (
                <div className="border-t border-line/50 pt-3 space-y-3">
                  <span className="text-xs text-slate font-semibold font-body">Custom Profile Fields</span>
                  {customFieldDefinitions.map(def => (
                    <Input 
                      key={def.id} 
                      label={def.name} 
                      value={customFieldValues[def.key] || ""} 
                      onChange={(e) => setCustomFieldValues({...customFieldValues, [def.key]: e.target.value})} 
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddCustomField}
                className="text-berry text-xs font-semibold flex items-center gap-1 hover:underline mt-2"
              >
                <Plus size={14} /> Add Custom Profile Field
              </button>
            </div>
          )}
        </div>

        {/* SECTION 3: Collapsible Clinic Details */}
        <div className="border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setShowClinicDetails(!showClinicDetails)}
            className="w-full flex items-center justify-between text-xs uppercase tracking-wide text-slate font-medium font-body"
          >
            <span>Clinic / Business Info</span>
            {showClinicDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {showClinicDetails && (
            <div className="space-y-4 mt-3">
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Office Phone Line" 
                  value={clinicForm.phone} 
                  onChange={(e) => setClinicForm({...clinicForm, phone: e.target.value})} 
                  disabled={!!selectedClinic}
                />
                <Input 
                  label="Clinic Website" 
                  placeholder="https://..."
                  value={clinicForm.website} 
                  onChange={(e) => setClinicForm({...clinicForm, website: e.target.value})} 
                  disabled={!!selectedClinic}
                />
              </div>
              <Input 
                label="Clinic Street Address" 
                value={clinicForm.address_street} 
                onChange={(e) => setClinicForm({...clinicForm, address_street: e.target.value})} 
                disabled={!!selectedClinic}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input 
                  label="Clinic City" 
                  value={clinicForm.address_city} 
                  onChange={(e) => setClinicForm({...clinicForm, address_city: e.target.value})} 
                  disabled={!!selectedClinic}
                />
                <Input 
                  label="Clinic State" 
                  value={clinicForm.address_state} 
                  onChange={(e) => setClinicForm({...clinicForm, address_state: e.target.value})} 
                  disabled={!!selectedClinic}
                />
                <Input 
                  label="Clinic Zip" 
                  value={clinicForm.address_zip} 
                  onChange={(e) => setClinicForm({...clinicForm, address_zip: e.target.value})} 
                  disabled={!!selectedClinic}
                />
              </div>
              <Input 
                label="Clinic LinkedIn Page" 
                value={clinicForm.social_linkedin} 
                onChange={(e) => setClinicForm({...clinicForm, social_linkedin: e.target.value})} 
                disabled={!!selectedClinic}
              />
              {selectedClinic && (
                <p className="text-[10px] text-slate font-body italic">
                  Note: Clinic fields are locked because you linked to an existing profile. To edit them, update the company profile.
                </p>
              )}
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