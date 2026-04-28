import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Mail, ArrowRight, Loader2, ShieldCheck, KeyRound, CheckCircle2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { PasswordStrength } from "@/components/PasswordStrength";

type Step = "email" | "otp" | "reset" | "success";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const startResendTimer = useCallback(() => setResendTimer(60), []);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    try {
      setLoading(true);
      await api.auth.forgotPassword({ email: email.trim() });
      setStep("otp");
      startResendTimer();
      toast.success("OTP sent to your email");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP");
      return;
    }
    try {
      setLoading(true);
      const res = await api.auth.verifyResetOTP({ email: email.trim(), otp });
      setResetToken(res.resetToken);
      setStep("reset");
      toast.success("OTP verified!");
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    try {
      await api.auth.forgotPassword({ email: email.trim() });
      startResendTimer();
      toast.success("New OTP sent to your email");
      setOtp("");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend OTP");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    try {
      setLoading(true);
      await api.auth.resetPassword({ resetToken, newPassword });
      setStep("success");
      toast.success("Password reset successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const stepConfig: Record<Step, { icon: any; title: string; subtitle: string }> = {
    email: { icon: Mail, title: "Forgot password?", subtitle: "No worries, we'll send you a reset code." },
    otp: { icon: ShieldCheck, title: "Verify your email", subtitle: `We sent a code to ${email}` },
    reset: { icon: KeyRound, title: "Set new password", subtitle: "Create a strong password for your account." },
    success: { icon: CheckCircle2, title: "Password reset!", subtitle: "Your password has been successfully updated." },
  };

  const current = stepConfig[step];
  const StepIcon = current.icon;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1504457047772-27faf1c00561?auto=format&fit=crop&q=80&w=1600"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-secondary/30 to-background/10" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <Link href="/">
            <span className="inline-flex cursor-pointer items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur"><Compass className="h-5 w-5" /></span>
              <span className="font-serif text-3xl">Wander</span>
            </span>
          </Link>
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Account recovery</span>
            <h1 className="font-serif text-5xl leading-tight">Back on track.</h1>
            <p className="max-w-md text-white/80">Reset your password and get back to planning your next adventure.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <Link href="/">
              <span className="inline-flex cursor-pointer items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Compass className="h-5 w-5" /></span>
                <span className="font-serif text-3xl">Wander</span>
              </span>
            </Link>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
                  <StepIcon className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{current.title}</h2>
                <p className="text-sm text-muted-foreground">{current.subtitle}</p>
              </div>

              {/* Step: Email Input */}
              {step === "email" && (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email address</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input pl-10"
                        placeholder="you@wander.travel"
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Send reset code"} {!loading && <ArrowRight className="h-4 w-4" />}
                  </button>
                  <Link href="/login" className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                  </Link>
                </form>
              )}

              {/* Step: OTP Verification */}
              {step === "otp" && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={loading}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="h-12 w-12 text-lg font-bold rounded-lg border-2 data-[active]:border-primary" />
                        <InputOTPSlot index={1} className="h-12 w-12 text-lg font-bold rounded-lg border-2 data-[active]:border-primary" />
                        <InputOTPSlot index={2} className="h-12 w-12 text-lg font-bold rounded-lg border-2 data-[active]:border-primary" />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} className="h-12 w-12 text-lg font-bold rounded-lg border-2 data-[active]:border-primary" />
                        <InputOTPSlot index={4} className="h-12 w-12 text-lg font-bold rounded-lg border-2 data-[active]:border-primary" />
                        <InputOTPSlot index={5} className="h-12 w-12 text-lg font-bold rounded-lg border-2 data-[active]:border-primary" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <button
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.length !== 6}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <>Verify code <ArrowRight className="h-4 w-4" /></>}
                  </button>

                  <div className="text-center space-y-2">
                    {resendTimer > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Resend code in <span className="font-semibold text-foreground">{resendTimer}s</span>
                      </p>
                    ) : (
                      <button onClick={handleResendOTP} className="text-xs font-semibold text-primary hover:underline">
                        Resend code
                      </button>
                    )}
                    <button
                      onClick={() => { setStep("email"); setOtp(""); }}
                      className="block mx-auto text-xs font-semibold text-primary hover:underline"
                    >
                      Change email
                    </button>
                  </div>
                </div>
              )}

              {/* Step: New Password */}
              {step === "reset" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">New password</label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="input pl-10 pr-10"
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <PasswordStrength password={newPassword} />
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Confirm password</label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type={showConfirm ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input pl-10 pr-10"
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? "Resetting..." : "Reset password"} {!loading && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>
              )}

              {/* Step: Success */}
              {step === "success" && (
                <div className="space-y-4 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your password has been reset. You can now sign in with your new password.
                  </p>
                  <Link href="/login">
                    <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98]">
                      Sign in <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
