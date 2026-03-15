"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Animation variants ────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FieldError {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

interface FieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  error?: string;
  focusedField: string | null;
  onChange: (v: string) => void;
  onFocus: (id: string) => void;
  onBlur: () => void;
  extra?: React.ReactNode;
}

// ── Password strength helper ──────────────────────────────────────────────────
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "#ef4444" };
  if (score === 2) return { score, label: "Fair", color: "#f59e0b" };
  if (score === 3) return { score, label: "Good", color: "#10b981" };
  return { score, label: "Strong", color: "#6d28d9" };
}

// ── Field component — defined OUTSIDE SignupPage to prevent remounting ────────
function Field({
  id,
  label,
  type = "text",
  placeholder,
  value,
  error,
  focusedField,
  onChange,
  onFocus,
  onBlur,
  extra,
}: FieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-zinc-300 text-sm font-medium">{label}</label>
        {extra}
      </div>
      <motion.div
        animate={{
          borderColor:
            focusedField === id
              ? "rgba(167,139,250,0.6)"
              : error
              ? "rgba(239,68,68,0.4)"
              : "rgba(255,255,255,0.08)",
        }}
        className="relative rounded-xl border bg-white/[0.03] overflow-hidden"
      >
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => onFocus(id)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full bg-transparent px-4 py-3 text-white placeholder:text-zinc-600 text-sm outline-none"
        />
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-red-400 text-xs mt-1.5 ml-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const strength = getPasswordStrength(form.password);

  const validate = (): boolean => {
    const newErrors: FieldError = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.email) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Enter a valid email";
    if (!form.password) newErrors.password = "Password is required";
    else if (form.password.length < 6) newErrors.password = "Minimum 6 characters";
    if (!form.confirmPassword) newErrors.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = "Passwords don't match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ general: data.message ?? "Signup failed. Try again." });
        return;
      }

      router.push("/dashboard");
    } catch {
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#080810] flex items-center justify-center overflow-hidden px-4 py-12">

      {/* ── Background effects ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#a78bfa 1px, transparent 1px), linear-gradient(90deg, #a78bfa 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-30%] right-[-10%] w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(109,40,217,0.12) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)" }}
        />
      </div>

      {/* ── Card ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo / brand */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 12L6 7L9 10L13 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">MarketPulse AI</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Create account</h1>
          <p className="text-zinc-400 mt-2 text-sm">Start monitoring markets intelligently</p>
        </motion.div>

        {/* Form card */}
        <motion.div
          variants={itemVariants}
          className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-xl shadow-2xl"
        >
          {/* General error */}
          <AnimatePresence>
            {errors.general && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                {errors.general}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            <Field
              id="name"
              label="Full name"
              placeholder="Jane Smith"
              value={form.name}
              error={errors.name}
              focusedField={focusedField}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              onFocus={setFocusedField}
              onBlur={() => setFocusedField(null)}
            />

            <Field
              id="email"
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              error={errors.email}
              focusedField={focusedField}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              onFocus={setFocusedField}
              onBlur={() => setFocusedField(null)}
            />

            {/* Password with strength meter — kept inline since it has extra UI */}
            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-2">Password</label>
              <motion.div
                animate={{
                  borderColor:
                    focusedField === "password"
                      ? "rgba(167,139,250,0.6)"
                      : errors.password
                      ? "rgba(239,68,68,0.4)"
                      : "rgba(255,255,255,0.08)",
                }}
                className="relative rounded-xl border bg-white/[0.03] overflow-hidden"
              >
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className="w-full bg-transparent px-4 py-3 text-white placeholder:text-zinc-600 text-sm outline-none"
                />
              </motion.div>

              {/* Strength meter */}
              <AnimatePresence>
                {form.password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2"
                  >
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          className="h-1 flex-1 rounded-full"
                          animate={{
                            backgroundColor: i <= strength.score ? strength.color : "rgba(255,255,255,0.08)",
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strength.color }}>
                      {strength.label} password
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-red-400 text-xs mt-1.5 ml-1"
                  >
                    {errors.password}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <Field
              id="confirmPassword"
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              value={form.confirmPassword}
              error={errors.confirmPassword}
              focusedField={focusedField}
              onChange={(v) => setForm((f) => ({ ...f, confirmPassword: v }))}
              onFocus={setFocusedField}
              onBlur={() => setFocusedField(null)}
            />

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="relative w-full py-3 rounded-xl font-semibold text-sm text-white overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)" }}
            >
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </span>
            </motion.button>
          </form>

          {/* Terms */}
          <p className="text-zinc-600 text-xs text-center mt-5 leading-relaxed">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-zinc-400 hover:text-white transition-colors underline underline-offset-2">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors underline underline-offset-2">
              Privacy Policy
            </Link>
          </p>
        </motion.div>

        {/* Footer */}
        <motion.p variants={itemVariants} className="text-center text-zinc-500 text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
