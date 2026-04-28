import { useMemo } from "react";

type PasswordStrengthProps = {
  password: string;
};

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const analysis = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "", checks: [] };

    const checks = [
      { label: "At least 8 characters", passed: password.length >= 8 },
      { label: "Uppercase letter", passed: /[A-Z]/.test(password) },
      { label: "Lowercase letter", passed: /[a-z]/.test(password) },
      { label: "Number", passed: /[0-9]/.test(password) },
      { label: "Special character", passed: /[^A-Za-z0-9]/.test(password) },
    ];

    const passedCount = checks.filter((c) => c.passed).length;
    let score: number, label: string, color: string;

    if (passedCount <= 1) { score = 1; label = "Very weak"; color = "bg-red-500"; }
    else if (passedCount === 2) { score = 2; label = "Weak"; color = "bg-orange-500"; }
    else if (passedCount === 3) { score = 3; label = "Fair"; color = "bg-yellow-500"; }
    else if (passedCount === 4) { score = 4; label = "Strong"; color = "bg-emerald-400"; }
    else { score = 5; label = "Very strong"; color = "bg-emerald-500"; }

    return { score, label, color, checks };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= analysis.score ? analysis.color : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-[11px] font-medium text-muted-foreground">
        {analysis.label}
      </p>
      <div className="space-y-0.5">
        {analysis.checks.map((check) => (
          <div
            key={check.label}
            className={`text-[11px] transition-colors ${
              check.passed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            }`}
          >
            {check.passed ? "✓" : "○"} {check.label}
          </div>
        ))}
      </div>
    </div>
  );
}
