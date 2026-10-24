"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

type Step = "email" | "otp" | "new-password" | "done";

const inp = (hasError: boolean) =>
  `w-full px-4 py-3 bg-white/5 border ${hasError ? "border-red-500" : "border-white/15"} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all`;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: "Valid email required" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setLoading(false);
    if (error) {
      setErrors({ email: error.message });
      return;
    }
    setStep("otp");
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setErrors({ otp: "Enter the 6-digit code" }); return; }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    setLoading(false);
    if (error) { setErrors({ otp: "Invalid or expired code. Try again." }); return; }
    setStep("new-password");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (password.length < 8) errs.password = "Min. 8 characters";
    if (password !== confirm) errs.confirm = "Passwords do not match";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setErrors({ password: error.message }); return; }
    setStep("done");
    showToast("Password reset successfully!", "success");
    setTimeout(() => router.push("/login"), 2000);
  };

  const resendOtp = async () => {
    setLoading(true);
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setLoading(false);
    showToast("New code sent!", "success");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl animate-fade-in">

          {step === "email" && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-1">Reset password</h1>
                <p className="text-gray-400 text-sm">We'll send a verification code to your email.</p>
              </div>
              <form onSubmit={handleEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                  <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                    placeholder="you@email.com" className={inp(!!errors.email)} />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                  {loading ? "Sending code…" : "Send verification code"}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-6">
                <Link href="/login" className="text-violet-400 hover:text-violet-300">← Back to sign in</Link>
              </p>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-1">Check your email</h2>
                <p className="text-gray-400 text-sm">Enter the 6-digit code sent to <span className="text-white">{email}</span>.</p>
              </div>
              <form onSubmit={handleOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Verification code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setErrors({}); }}
                    placeholder="123456"
                    className={`${inp(!!errors.otp)} text-center text-2xl tracking-[0.5em] font-mono`}
                  />
                  {errors.otp && <p className="text-xs text-red-400 mt-1">{errors.otp}</p>}
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                  {loading ? "Verifying…" : "Verify code"}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-4">
                Didn't receive it?{" "}
                <button onClick={resendOtp} disabled={loading} className="text-violet-400 hover:text-violet-300 disabled:opacity-60">
                  Resend code
                </button>
              </p>
            </>
          )}

          {step === "new-password" && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-1">New password</h2>
                <p className="text-gray-400 text-sm">Choose a strong new password.</p>
              </div>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">New password</label>
                  <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setErrors((er) => ({ ...er, password: undefined! })); }}
                    placeholder="Min. 8 characters" className={inp(!!errors.password)} />
                  {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm password</label>
                  <input type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setErrors((er) => ({ ...er, confirm: undefined! })); }}
                    placeholder="Repeat password" className={inp(!!errors.confirm)} />
                  {errors.confirm && <p className="text-xs text-red-400 mt-1">{errors.confirm}</p>}
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                  {loading ? "Resetting…" : "Reset password"}
                </button>
              </form>
            </>
          )}

          {step === "done" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Password reset!</h2>
              <p className="text-gray-400 text-sm">Redirecting you to sign in…</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
