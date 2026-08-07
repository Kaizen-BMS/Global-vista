"use client";
import { useState, useId } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function FloatingInput({ label, type = "text", value, onChange, required, icon: Icon, autoComplete, minLength, error }) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;
  const floated = focused || value?.length > 0;

  return (
    <div>
      <div className={`relative rounded-xl border bg-white/[0.03] transition-all duration-200 ${error ? "border-red-500/60" : focused ? "border-indigo-500/70 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]" : "border-white/10 hover:border-white/20"}`}>
        {Icon && <Icon className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focused ? "text-indigo-400" : "text-white/40"}`} />}
        <input
          id={id}
          type={resolvedType}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label={label}
          aria-invalid={!!error}
          placeholder=" "
          className={`peer w-full bg-transparent text-white text-sm pt-5 pb-2 ${Icon ? "pl-10" : "pl-3.5"} ${isPassword ? "pr-10" : "pr-3.5"} focus:outline-none`}
        />
        <label
          htmlFor={id}
          className={`absolute pointer-events-none transition-all duration-200 ${Icon ? "left-10" : "left-3.5"} ${floated ? "top-2 text-[11px]" : "top-1/2 -translate-y-1/2 text-sm"} ${focused ? "text-indigo-400" : "text-white/40"}`}
        >
          {label}
        </label>
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">{error}</p>}
    </div>
  );
}
