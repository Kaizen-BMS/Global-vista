"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { LEAD_PRIORITIES } from "@/lib/modules/crm/constants/leadStages";

const SECTIONS = ["Personal", "Academic", "Study Preferences", "Passport", "Source & Assignment", "Notes"];

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-neutral-300 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function LeadForm({ sources = [], services = [], counsellors = [], initialData = null }) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [form, setForm] = useState(
    initialData || {
      name: "", email: "", phone: "", whatsapp: "",
      country: "", state: "", city: "", address: "", gender: "", dob: "",
      school: "", college: "", currentQualification: "", passingYear: "", percentage: "",
      englishTest: "", ieltsScore: "", pteScore: "",
      preferredCountry: "", preferredUniversity: "", preferredIntake: "", budget: "", passportStatus: "",
      leadSourceId: "", campaign: "", serviceId: "", assignedTo: "", priority: "Medium", tags: "",
      remarks: "", notes: "",
    }
  );

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function checkDuplicate(phone) {
    if (!phone || phone.length < 7) return;
    try {
      const res = await fetch(`/api/leads?search=${encodeURIComponent(phone)}&pageSize=1`);
      const data = await res.json();
      if (data.leads?.length > 0 && data.leads[0].id !== initialData?.id) {
        setDuplicateWarning(data.leads[0]);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // non-blocking
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const isEdit = !!initialData?.id;
      const res = await fetch(isEdit ? `/api/leads/${initialData.id}` : "/api/leads", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save lead.");
        setSaving(false);
        return;
      }

      toast.success(isEdit ? "Lead updated." : "Lead created.");
      const targetId = isEdit ? initialData.id : data.id;

      // Explicit navigation + refresh so the toast is followed by a real
      // redirect into the lead's details page and a fresh server render
      // (fixes "toast appears but user stays on same page").
      router.push(`/workspace/lead-management/${targetId}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {duplicateWarning && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-4 px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-300 text-sm"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Possible duplicate: {duplicateWarning.name} ({duplicateWarning.phone}) already exists.
        </motion.div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {SECTIONS.map((section, i) => (
          <button
            type="button"
            key={section}
            onClick={() => setActiveSection(i)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
              activeSection === i ? "bg-indigo-600 text-white" : "bg-neutral-900 text-neutral-400 hover:text-white"
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      <motion.div
        key={activeSection}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4"
      >
        {activeSection === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name *"><input required className={inputClass} value={form.name} onChange={(e) => setField("name", e.target.value)} /></Field>
            <Field label="Phone *">
              <input required className={inputClass} value={form.phone} onChange={(e) => { setField("phone", e.target.value); checkDuplicate(e.target.value); }} />
            </Field>
            <Field label="Email"><input type="email" className={inputClass} value={form.email} onChange={(e) => setField("email", e.target.value)} /></Field>
            <Field label="WhatsApp"><input className={inputClass} value={form.whatsapp} onChange={(e) => setField("whatsapp", e.target.value)} /></Field>
            <Field label="Country"><input className={inputClass} value={form.country} onChange={(e) => setField("country", e.target.value)} /></Field>
            <Field label="State"><input className={inputClass} value={form.state} onChange={(e) => setField("state", e.target.value)} /></Field>
            <Field label="City"><input className={inputClass} value={form.city} onChange={(e) => setField("city", e.target.value)} /></Field>
            <Field label="Gender">
              <select className={inputClass} value={form.gender} onChange={(e) => setField("gender", e.target.value)}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Date of Birth"><input type="date" className={inputClass} value={form.dob} onChange={(e) => setField("dob", e.target.value)} /></Field>
            <Field label="Address"><input className={inputClass} value={form.address} onChange={(e) => setField("address", e.target.value)} /></Field>
          </div>
        )}

        {activeSection === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="School"><input className={inputClass} value={form.school} onChange={(e) => setField("school", e.target.value)} /></Field>
            <Field label="College"><input className={inputClass} value={form.college} onChange={(e) => setField("college", e.target.value)} /></Field>
            <Field label="Current Qualification"><input className={inputClass} value={form.currentQualification} onChange={(e) => setField("currentQualification", e.target.value)} /></Field>
            <Field label="Passing Year"><input type="number" className={inputClass} value={form.passingYear} onChange={(e) => setField("passingYear", e.target.value)} /></Field>
            <Field label="Percentage / GPA"><input type="number" step="0.01" className={inputClass} value={form.percentage} onChange={(e) => setField("percentage", e.target.value)} /></Field>
            <Field label="English Test">
              <select className={inputClass} value={form.englishTest} onChange={(e) => setField("englishTest", e.target.value)}>
                <option value="">None</option>
                <option value="IELTS">IELTS</option>
                <option value="PTE">PTE</option>
                <option value="TOEFL">TOEFL</option>
                <option value="Duolingo">Duolingo</option>
              </select>
            </Field>
            <Field label="IELTS Score"><input type="number" step="0.5" className={inputClass} value={form.ieltsScore} onChange={(e) => setField("ieltsScore", e.target.value)} /></Field>
            <Field label="PTE Score"><input type="number" className={inputClass} value={form.pteScore} onChange={(e) => setField("pteScore", e.target.value)} /></Field>
          </div>
        )}

        {activeSection === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Preferred Country"><input className={inputClass} value={form.preferredCountry} onChange={(e) => setField("preferredCountry", e.target.value)} /></Field>
            <Field label="Preferred University"><input className={inputClass} value={form.preferredUniversity} onChange={(e) => setField("preferredUniversity", e.target.value)} /></Field>
            <Field label="Preferred Intake"><input className={inputClass} value={form.preferredIntake} onChange={(e) => setField("preferredIntake", e.target.value)} /></Field>
            <Field label="Budget"><input className={inputClass} value={form.budget} onChange={(e) => setField("budget", e.target.value)} /></Field>
          </div>
        )}

        {activeSection === 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Passport Status">
              <select className={inputClass} value={form.passportStatus} onChange={(e) => setField("passportStatus", e.target.value)}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Applied">Applied</option>
              </select>
            </Field>
          </div>
        )}

        {activeSection === 4 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Lead Source *">
              <select required className={inputClass} value={form.leadSourceId} onChange={(e) => setField("leadSourceId", e.target.value)}>
                <option value="">Select source</option>
                {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Service *">
              <select required className={inputClass} value={form.serviceId} onChange={(e) => setField("serviceId", e.target.value)}>
                <option value="">Select service</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Campaign"><input className={inputClass} value={form.campaign} onChange={(e) => setField("campaign", e.target.value)} /></Field>
            <Field label="Assign To">
              <select className={inputClass} value={form.assignedTo} onChange={(e) => setField("assignedTo", e.target.value)}>
                <option value="">Unassigned</option>
                {counsellors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select className={inputClass} value={form.priority} onChange={(e) => setField("priority", e.target.value)}>
                {LEAD_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Tags (comma separated)"><input className={inputClass} value={form.tags} onChange={(e) => setField("tags", e.target.value)} /></Field>
          </div>
        )}

        {activeSection === 5 && (
          <div className="space-y-4">
            <Field label="Remarks"><textarea rows={3} className={inputClass} value={form.remarks} onChange={(e) => setField("remarks", e.target.value)} /></Field>
            <Field label="Notes"><textarea rows={3} className={inputClass} value={form.notes} onChange={(e) => setField("notes", e.target.value)} /></Field>
          </div>
        )}
      </motion.div>

      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          disabled={activeSection === 0}
          onClick={() => setActiveSection((s) => Math.max(0, s - 1))}
          className="px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm disabled:opacity-40"
        >
          Back
        </button>

        {activeSection < SECTIONS.length - 1 ? (
          <button
            type="button"
            onClick={() => setActiveSection((s) => Math.min(SECTIONS.length - 1, s + 1))}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : initialData?.id ? "Update Lead" : "Create Lead"}
          </button>
        )}
      </div>
    </form>
  );
}