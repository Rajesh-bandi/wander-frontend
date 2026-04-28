import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Compass, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const [loc] = useLocation();
  const { currentUser, verifyOTP, sendOTP, logout } = useStore();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  // Get email from either currentUser (logged in) or URL query param (from login redirect)
  const params = new URLSearchParams(loc.split("?")[1] || "");
  const emailFromQuery = params.get("email") || "";
  const email = currentUser?.email || emailFromQuery;
  const isLoggedIn = !!currentUser;

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const startResendTimer = useCallback(() => setResendTimer(60), []);

  // Send initial OTP on mount
  useEffect(() => {
    if (!email || otpSent) return;
    const sendInitial = async () => {
      try {
        if (isLoggedIn) {
          await sendOTP(email, "SIGNUP");
        } else {
          await api.auth.sendOTP({ email, purpose: "SIGNUP" });
        }
        startResendTimer();
        setOtpSent(true);
      } catch (err: any) {
        toast.error(err.message || "Failed to send OTP");
      }
    };
    sendInitial();
  }, [email]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP");
      return;
    }
    try {
      setLoading(true);
      if (isLoggedIn) {
        await verifyOTP(email, otp, "SIGNUP");
        toast.success("Email verified! Welcome to Wander.");
        navigate("/");
      } else {
        const res = await api.auth.verifyOTP({ email, otp, purpose: "SIGNUP" });
        if (res.verified) {
          toast.success("Email verified! You can now sign in.");
          navigate("/login");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      if (isLoggedIn) {
        await sendOTP(email, "SIGNUP");
      } else {
        await api.auth.sendOTP({ email, purpose: "SIGNUP" });
      }
      startResendTimer();
      toast.success("New OTP sent to your email");
      setOtp("");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend OTP");
    }
  };

  if (!email) {
    navigate("/login");
    return null;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/">
            <span className="inline-flex cursor-pointer items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Compass className="h-5 w-5" /></span>
              <span className="font-serif text-3xl">Wander</span>
            </span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Verify your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>
            </p>
          </div>

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
            onClick={handleVerify}
            disabled={loading || otp.length !== 6}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <>Verify email <ArrowRight className="h-4 w-4" /></>}
          </button>

          <div className="text-center space-y-2">
            {resendTimer > 0 ? (
              <p className="text-xs text-muted-foreground">
                Resend code in <span className="font-semibold text-foreground">{resendTimer}s</span>
              </p>
            ) : (
              <button onClick={handleResend} className="text-xs font-semibold text-primary hover:underline">
                Resend OTP
              </button>
            )}
            <div className="flex items-center justify-center gap-3 text-xs">
              {isLoggedIn ? (
                <button
                  onClick={() => { logout(); navigate("/login"); }}
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  Sign out
                </button>
              ) : (
                <Link href="/login" className="text-muted-foreground hover:text-foreground transition">
                  Back to sign in
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
