import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Mail, Lock, User as UserIcon, MapPin, ArrowRight, Phone, Home, LocateFixed, Loader2, Eye, EyeOff, ShieldCheck, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { PasswordStrength } from "@/components/PasswordStrength";

type Mode = "signin" | "signup";
type SignupStep = "form" | "otp";

const HERO_IMAGES: Record<Mode, string> = {
  signin: "https://images.unsplash.com/photo-1504457047772-27faf1c00561?auto=format&fit=crop&q=80&w=1600",
  signup: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1600",
};

const COPY: Record<Mode, { eyebrow: string; title: string; subtitle: string; cta: string; switchText: string; switchHref: string; switchCta: string }> = {
  signin: {
    eyebrow: "Welcome back",
    title: "Where the next trip begins.",
    subtitle: "Sign back in to your travel circle and pick up where you left off.",
    cta: "Sign in",
    switchText: "New to Wander?",
    switchHref: "/signup",
    switchCta: "Create an account",
  },
  signup: {
    eyebrow: "Join the community",
    title: "Find your travel crew.",
    subtitle: "Create plans, join trips, and meet travelers heading to the same places as you.",
    cta: "Create account",
    switchText: "Already have an account?",
    switchHref: "/login",
    switchCta: "Sign in",
  },
};

export default function Auth({ mode }: { mode: Mode }) {
  const [, navigate] = useLocation();
  const { signup, signin, verifyOTP, sendOTP } = useStore();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // OTP verification state
  const [signupStep, setSignupStep] = useState<SignupStep>("form");
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const c = COPY[mode];

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const startResendTimer = useCallback(() => setResendTimer(60), []);

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported by your browser"); return; }

    const isSecure = window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!isSecure) {
      toast.error("Location detection requires HTTPS. Please enter your location manually.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept": "application/json" } }
          );
          const data = await resp.json();
          if (data.display_name) {
            setAddress(data.display_name);
            const city = data.address?.city || data.address?.town || data.address?.village || "";
            const country = data.address?.country || "";
            if (!location) setLocation([city, country].filter(Boolean).join(", "));
          }
          toast.success("Location detected!");
        } catch {
          setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setLocating(false);
      },
      (err) => { toast.error("Could not get location: " + err.message); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      if (mode === "signup") {
        if (!username.trim() || !name.trim() || !email.trim() || !password) {
          toast.error("Please fill in all required fields.");
          return;
        }
        if (password !== confirm) {
          toast.error("Passwords don't match.");
          return;
        }

        const result = await signup({
          username: username.trim().toLowerCase(),
          email: email.trim(),
          password,
          displayName: name.trim(),
          location: location.trim() || undefined,
          mobile: mobile.trim() || undefined,
          address: address.trim() || undefined,
          coordinates: coords || undefined,
        } as any);

        if (result.requiresVerification) {
          setSignupStep("otp");
          startResendTimer();
          toast.success("OTP sent to your email", { description: "Please check your inbox." });
        } else {
          toast.success("Welcome to Wander", { description: "Your account is ready." });
          navigate("/");
        }
      } else {
        if (!email.trim() || !password) {
          toast.error("Enter your email and password.");
          return;
        }
        await signin({ email: email.trim(), password });
        toast.success("Welcome back");
        navigate("/");
      }
    } catch (err: any) {
      const msg = err.message || "Something went wrong";
      // Check if login failed because user is not verified
      if (err.requiresVerification) {
        toast.error("Email not verified", { description: "Redirecting to verification..." });
        navigate(`/verify-email?email=${encodeURIComponent(err.email || email.trim())}`);
      } else {
        toast.error(msg);
      }
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
      setOtpLoading(true);
      await verifyOTP(email.trim(), otp, "SIGNUP");
      toast.success("Email verified!", { description: "Welcome to Wander." });
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP");
      setOtp("");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    try {
      await sendOTP(email.trim(), "SIGNUP");
      startResendTimer();
      toast.success("New OTP sent to your email");
      setOtp("");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend OTP");
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <motion.img
          key={mode}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          src={HERO_IMAGES[mode]}
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
          <motion.div
            key={`copy-${mode}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-3"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">{c.eyebrow}</span>
            <h1 className="font-serif text-5xl leading-tight">{c.title}</h1>
            <p className="max-w-md text-white/80">{c.subtitle}</p>
          </motion.div>
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

          {/* OTP Verification Step */}
          <AnimatePresence mode="wait">
            {mode === "signup" && signupStep === "otp" ? (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
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
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={otpLoading}>
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
                  disabled={otpLoading || otp.length !== 6}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                >
                  {otpLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      Verify email {!otpLoading && <ArrowRight className="h-4 w-4" />}
                    </>
                  )}
                </button>

                <div className="text-center space-y-2">
                  {resendTimer > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Resend code in <span className="font-semibold text-foreground">{resendTimer}s</span>
                    </p>
                  ) : (
                    <button
                      onClick={handleResendOTP}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Resend OTP
                    </button>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Wrong email?{" "}
                    <button
                      onClick={() => { setSignupStep("form"); setOtp(""); }}
                      className="font-semibold text-primary hover:underline"
                    >
                      Go back
                    </button>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form-step"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <div className="grid grid-cols-2 rounded-full border border-border bg-card p-1 text-sm font-semibold">
                  <Link href="/login" className={`rounded-full py-2 text-center transition ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Sign in</Link>
                  <Link href="/signup" className={`rounded-full py-2 text-center transition ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Sign up</Link>
                </div>

                <form onSubmit={submit} className="mt-6 space-y-4">
                  {mode === "signup" && (
                    <>
                      <Field label="Username" icon={UserIcon}>
                        <input value={username} onChange={(e) => setUsername(e.target.value)} className="input pl-10" placeholder="traveler_123" autoComplete="username" />
                      </Field>
                      <Field label="Display name" icon={UserIcon}>
                        <input value={name} onChange={(e) => setName(e.target.value)} className="input pl-10" placeholder="Your name" autoComplete="name" />
                      </Field>
                      <Field label="Mobile number" icon={Phone}>
                        <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} className="input pl-10" placeholder="+91 9876543210" autoComplete="tel" />
                      </Field>
                      <Field label="Where you're based" icon={MapPin}>
                        <input value={location} onChange={(e) => setLocation(e.target.value)} className="input pl-10" placeholder="City, Country" autoComplete="address-level2" />
                      </Field>
                      <Field label="Address" icon={Home}>
                        <div className="flex gap-2">
                          <input value={address} onChange={(e) => setAddress(e.target.value)} className="input flex-1 pl-10" placeholder="Full address (optional)" autoComplete="street-address" />
                          <button
                            type="button"
                            onClick={useMyLocation}
                            disabled={locating}
                            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold transition hover:bg-muted active:scale-[0.98] disabled:opacity-50"
                          >
                            {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                            {locating ? "Detecting..." : "Use my location"}
                          </button>
                        </div>
                      </Field>
                    </>
                  )}
                  <Field label="Email" icon={Mail}>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="you@wander.travel" autoComplete="email" />
                  </Field>
                  <Field label="Password" icon={Lock}>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input pl-10 pr-10"
                        placeholder="••••••••"
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                  {mode === "signup" && (
                    <>
                      <PasswordStrength password={password} />
                      <Field label="Confirm password" icon={Lock}>
                        <div className="relative">
                          <input
                            type={showConfirm ? "text" : "password"}
                            required
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
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
                      </Field>
                    </>
                  )}

                  {mode === "signin" && (
                    <div className="flex items-center justify-between text-xs">
                      <label className="inline-flex items-center gap-2 text-muted-foreground">
                        <input type="checkbox" className="accent-primary" /> Remember me
                      </label>
                      <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground hover:underline">Forgot password?</Link>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? "Please wait..." : c.cta} {!loading && <ArrowRight className="h-4 w-4" />}
                  </button>

                  <p className="text-center text-xs text-muted-foreground">
                    {c.switchText}{" "}
                    <Link href={c.switchHref} className="font-semibold text-primary hover:underline">{c.switchCta}</Link>
                  </p>
                  {mode === "signup" && (
                    <p className="text-center text-[11px] text-muted-foreground">
                      By creating an account you agree to our Terms and Privacy Policy.
                    </p>
                  )}
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}
