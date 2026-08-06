"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/crm/shared/apiClient";

const inputClass = "flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function GeographyEditor({ countries }) {
  const router = useRouter();
  const [selectedCountryId, setSelectedCountryId] = useState(countries[0]?.id || "");
  const [states, setStates] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [newCountry, setNewCountry] = useState("");
  const [newState, setNewState] = useState("");
  const [newCity, setNewCity] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedCountryId) return;
    setLoadingStates(true);
    fetch(`/api/settings/geography/states?countryId=${selectedCountryId}`)
      .then((r) => r.json())
      .then((d) => { setStates(d.states || []); setSelectedStateId(""); setCities([]); })
      .finally(() => setLoadingStates(false));
  }, [selectedCountryId]);

  useEffect(() => {
    if (!selectedStateId) { setCities([]); return; }
    setLoadingCities(true);
    fetch(`/api/settings/geography/cities?stateId=${selectedStateId}`)
      .then((r) => r.json())
      .then((d) => setCities(d.cities || []))
      .finally(() => setLoadingCities(false));
  }, [selectedStateId]);

  async function addCountry(e) {
    e.preventDefault();
    if (!newCountry.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings/geography/countries", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCountry.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Country added.");
      setNewCountry("");
      router.refresh();
    } catch { toast.error("Failed to add country."); } finally { setSaving(false); }
  }

  async function addState(e) {
    e.preventDefault();
    if (!newState.trim() || !selectedCountryId) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings/geography/states", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryId: selectedCountryId, name: newState.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("State added.");
      setNewState("");
      const refreshed = await fetch(`/api/settings/geography/states?countryId=${selectedCountryId}`).then((r) => r.json());
      setStates(refreshed.states || []);
    } catch { toast.error("Failed to add state."); } finally { setSaving(false); }
  }

  async function addCity(e) {
    e.preventDefault();
    if (!newCity.trim() || !selectedStateId) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings/geography/cities", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateId: selectedStateId, name: newCity.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("City added.");
      setNewCity("");
      const refreshed = await fetch(`/api/settings/geography/cities?stateId=${selectedStateId}`).then((r) => r.json());
      setCities(refreshed.cities || []);
    } catch { toast.error("Failed to add city."); } finally { setSaving(false); }
  }

  async function deleteRecord(table, id, refreshFn) {
    try {
      const res = await apiFetch(`/api/settings/geography/${table}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Removed.");
      refreshFn();
    } catch {
      toast.error("Failed to remove.");
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <h3 className="text-white font-medium mb-3">Countries</h3>
        <form onSubmit={addCountry} className="flex gap-2 mb-3">
          <input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} placeholder="New country" className={inputClass} />
          <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </form>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {countries.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCountryId(c.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedCountryId === c.id ? "bg-indigo-600/10 text-indigo-400 border border-indigo-600/30" : "text-neutral-300 hover:bg-neutral-800"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <h3 className="text-white font-medium mb-3">States {loadingStates && <Loader2 className="inline h-3.5 w-3.5 animate-spin ml-1" />}</h3>
        <form onSubmit={addState} className="flex gap-2 mb-3">
          <input value={newState} onChange={(e) => setNewState(e.target.value)} placeholder="New state" className={inputClass} disabled={!selectedCountryId} />
          <button type="submit" disabled={saving || !selectedCountryId} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-60">
            <Plus className="h-4 w-4" />
          </button>
        </form>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {states.map((s) => (
            <div key={s.id} className="flex items-center justify-between">
              <button
                onClick={() => setSelectedStateId(s.id)}
                className={`flex-1 text-left px-3 py-2 rounded-lg text-sm ${selectedStateId === s.id ? "bg-indigo-600/10 text-indigo-400 border border-indigo-600/30" : "text-neutral-300 hover:bg-neutral-800"}`}
              >
                {s.name}
              </button>
              <button onClick={() => deleteRecord("states", s.id, () => setStates((prev) => prev.filter((x) => x.id !== s.id)))} className="text-neutral-500 hover:text-red-400 px-2">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <h3 className="text-white font-medium mb-3">Cities {loadingCities && <Loader2 className="inline h-3.5 w-3.5 animate-spin ml-1" />}</h3>
        <form onSubmit={addCity} className="flex gap-2 mb-3">
          <input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="New city" className={inputClass} disabled={!selectedStateId} />
          <button type="submit" disabled={saving || !selectedStateId} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-60">
            <Plus className="h-4 w-4" />
          </button>
        </form>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {cities.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 text-sm text-neutral-300">
              {c.name}
              <button onClick={() => deleteRecord("cities", c.id, () => setCities((prev) => prev.filter((x) => x.id !== c.id)))} className="text-neutral-500 hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}