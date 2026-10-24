"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import OtpInput from "@/components/OtpInput";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Step = "credentials" | "otp";
interface Errors { email?: string; password?: string }

const inp = (hasError: boolean) =>
  `w-full px-4 py-3 bg-white/5 border ${hasError ? "border-red-500" : "border-white/15"} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all`;

interface Props {
  onClose: () => void;
}

export default function SignInModal({ onClose }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Valid email required";
    if (!password) errs.password = "Password is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError("");

    // Verify credentials first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setLoading(false);
      if (authError.message.toLowerCase().includes("email not confirmed")) {
        setApiError("Please verify your email first. Check your inbox.");
      } else if (authError.message.toLowerCase().includes("invalid login credentials")) {
        setApiError("No account found with these credentials.");
      } else {
        setApiError(authError.message);
      }
      return;
    }

    // Check role and suspension status
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, role, status")
      .eq("id", authData.user.id)
      .single();

    if (profile?.status === "suspended") {
      await supabase.auth.signOut();
      setLoading(false);
      setApiError("Your account has been suspended. Please contact support.");
      return;
    }

    if (profile?.role === "admin") {
      setLoading(false);
      showToast(`Welcome back, ${profile.name}!`, "success");
      onClose();
      router.push("/admin");
      return;
    }

    // Regular users — sign out and send OTP
    await supabase.auth.signOut();

    // Send OTP to email
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    setLoading(false);

    if (otpError) {
      setApiError("Could not send OTP. Try again.");
      return;
    }

    showToast("Check your email for a 6-digit code.", "success");
    setStep("otp");
  };

  const handleOtp = async (otp: string) => {
    setLoading(true);
    setApiError("");

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (error) {
      setLoading(false);
      setApiError("Invalid or expired code. Try again.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, role, status")
      .eq("id", data.user!.id)
      .single();

    if (profile?.status === "suspended") {
      await supabase.auth.signOut();
      setLoading(false);
      setApiError("Your account has been suspended. Please contact support.");
      setStep("credentials");
      return;
    }

    setLoading(false);
    showToast(`Welcome back, ${profile?.name ?? "User"}!`, "success");
    onClose();
    router.push(profile?.role === "admin" ? "/admin" : "/dashboard");
  };

  const handleResend = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) {
      showToast("Could not resend code. Try again.", "error");
    } else {
      showToast("New code sent to your email.", "info");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#0f0f1a] border border-white/10 rounded-2xl p-8 shadow-2xl animate-fade-in">
        {/* X close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Step: Credentials */}
        {step === "credentials" && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
              <p className="text-gray-400 text-sm">Sign in to your Shopora account.</p>
            </div>

            {apiError && (
              <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                {apiError}
              </div>
            )}

            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input
                  type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((er) => ({ ...er, email: undefined })); setApiError(""); }}
                  placeholder="you@email.com" className={inp(!!errors.email)}
                />
                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-300">Password</label>
                  <Link href="/forgot-password" onClick={onClose} className="text-xs text-violet-400 hover:text-violet-300">
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password" value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((er) => ({ ...er, password: undefined })); setApiError(""); }}
                  placeholder="Your password" className={inp(!!errors.password)}
                />
                {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors mt-2"
              >
                {loading ? "Verifying…" : "Sign in"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              No account?{" "}
              <Link href="/register" onClick={onClose} className="text-violet-400 hover:text-violet-300">
                Sign up first
              </Link>
            </p>
          </>
        )}

        {/* Step: OTP */}
        {step === "otp" && (
          <>
            <div className="mb-8 text-center">
              <div className="w-14 h-14 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Check your email</h2>
              <p className="text-gray-400 text-sm">
                We sent a 6-digit code to{" "}
                <span className="text-violet-400 font-medium">{email}</span>
              </p>
            </div>

            {apiError && (
              <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400 text-center">
                {apiError}
              </div>
            )}

            <OtpInput onComplete={handleOtp} onResend={handleResend} loading={loading} />

            <button
              onClick={() => { setStep("credentials"); setApiError(""); }}
              className="w-full mt-6 py-2.5 text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
