"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function GeographyEditor({ countries }) {
  const router = useRouter();
  const [selectedCountryId, setSelectedCountryId] = useState(countries[0]?.id || "");
  const [states, setStates] = useState([]); const [selectedStateId, setSelectedStateId] = useState(""); const [cities, setCities] = useState([]);
  const [newCountry, setNewCountry] = useState(""); const [newState, setNewState] = useState(""); const [newCity, setNewCity] = useState("");

  useEffect(() => { if (!selectedCountryId) return; fetch(`/api/core/organization/geography/states?countryId=${selectedCountryId}`).then((r) => r.json()).then((d) => { setStates(d.states || []); setSelectedStateId(""); setCities([]); }); }, [selectedCountryId]);
  useEffect(() => { if (!selectedStateId) { setCities([]); return; } fetch(`/api/core/organization/geography/cities?stateId=${selectedStateId}`).then((r) => r.json()).then((d) => setCities(d.cities || [])); }, [selectedStateId]);

  async function addCountry(e) { e.preventDefault(); if (!newCountry.trim()) return; await apiFetch("/api/core/organization/geography/countries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCountry.trim() }) }); setNewCountry(""); router.refresh(); }
  async function addState(e) { e.preventDefault(); if (!newState.trim()) return; await apiFetch("/api/core/organization/geography/states", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ countryId: selectedCountryId, name: newState.trim() }) }); setNewState(""); const r = await fetch(`/api/core/organization/geography/states?countryId=${selectedCountryId}`).then((r) => r.json()); setStates(r.states || []); }
  async function addCity(e) { e.preventDefault(); if (!newCity.trim()) return; await apiFetch("/api/core/organization/geography/cities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stateId: selectedStateId, name: newCity.trim() }) }); setNewCity(""); const r = await fetch(`/api/core/organization/geography/cities?stateId=${selectedStateId}`).then((r) => r.json()); setCities(r.cities || []); }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-foreground font-medium mb-3">Countries</h3>
        <form onSubmit={addCountry} className="flex gap-2 mb-3"><input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} aria-label="New country name" placeholder="New country" className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" /><button type="submit" aria-label="Add country" className="btn-brand px-3 py-2 rounded-lg text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"><Plus className="h-4 w-4" /></button></form>
        <div className="space-y-1">{countries.map((c) => <button key={c.id} onClick={() => setSelectedCountryId(c.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition cursor-pointer ${selectedCountryId === c.id ? "bg-indigo-600/10 text-indigo-400" : "text-foreground hover:bg-muted"}`}>{c.name}</button>)}</div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-foreground font-medium mb-3">States</h3>
        <form onSubmit={addState} className="flex gap-2 mb-3"><input value={newState} onChange={(e) => setNewState(e.target.value)} disabled={!selectedCountryId} aria-label="New state name" placeholder="New state" className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" /><button type="submit" disabled={!selectedCountryId} aria-label="Add state" className="btn-brand px-3 py-2 rounded-lg text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"><Plus className="h-4 w-4" /></button></form>
        <div className="space-y-1">{states.map((s) => <button key={s.id} onClick={() => setSelectedStateId(s.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition cursor-pointer ${selectedStateId === s.id ? "bg-indigo-600/10 text-indigo-400" : "text-foreground hover:bg-muted"}`}>{s.name}</button>)}</div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-foreground font-medium mb-3">Cities</h3>
        <form onSubmit={addCity} className="flex gap-2 mb-3"><input value={newCity} onChange={(e) => setNewCity(e.target.value)} disabled={!selectedStateId} aria-label="New city name" placeholder="New city" className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" /><button type="submit" disabled={!selectedStateId} aria-label="Add city" className="btn-brand px-3 py-2 rounded-lg text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"><Plus className="h-4 w-4" /></button></form>
        <div className="space-y-1">{cities.map((c) => <div key={c.id} className="px-3 py-2 text-sm text-foreground">{c.name}</div>)}</div>
      </div>
    </div>
  );
}