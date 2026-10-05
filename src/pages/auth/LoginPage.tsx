import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { useAuth } from "../../auth/useAuth";
import { ApiError, errorMessage } from "../../lib/api";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type LoginValues = z.infer<typeof loginSchema>;

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // Every credential failure is the same 400 (no account enumeration): wrong password,
    // deactivated, or password not set yet.
    if (error.status === 400) return "Invalid email or password.";
    if (error.status === 429) {
      const seconds = Number(error.data?.retry_after_seconds);
      const minutes = Number.isFinite(seconds) ? Math.max(1, Math.ceil(seconds / 60)) : null;
      return minutes
        ? `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
        : "Too many sign-in attempts. Try again later.";
    }
  }
  return errorMessage(error, "Could not sign in. Please try again.");
}

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (error) {
      setFormError(loginErrorMessage(error));
    }
  });

  const inputClass = (invalid: boolean) =>
    [
      "h-11 w-full rounded-md border bg-white px-3 text-sm outline-none transition placeholder:text-[var(--color-text-muted)] focus:ring-2",
      invalid
        ? "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-secondary-light)]"
        : "border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-light)]",
    ].join(" ");

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <div className="hidden w-[46%] flex-col justify-between bg-[var(--color-primary)] p-10 text-white lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-bold text-[var(--color-primary)]">
              M
            </div>
            <div>
              <div className="text-base font-bold">MyPageSEO</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                Admin Console
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-lg">
          <div className="mb-4 h-1 w-12 rounded-full bg-[var(--color-secondary)]" />
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Operations, visibility and control — in one place.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/65">
            Manage customers, organizations, reports, citations, billing and
            support from the MyPageSEO administrative console.
          </p>
        </div>

        <p className="text-xs text-white/40">
          MyPageSEO Admin · Internal use only
        </p>
      </div>

      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)] text-sm font-bold text-white">
                M
              </div>
              <div>
                <div className="text-base font-bold text-[var(--color-primary)]">
                  MyPageSEO
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                  Admin Console
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-secondary)]">
              Welcome back
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Use your administrator credentials to continue.
            </p>
          </div>

          {formError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-md border border-[var(--color-secondary-light)] bg-[var(--color-secondary-light)] px-3 py-2.5 text-sm text-[var(--color-danger)]"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={onSubmit} noValidate>
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@mypageseo.com"
                aria-invalid={!!errors.email}
                className={inputClass(!!errors.email)}
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-[var(--color-danger)]">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[var(--color-text-primary)]"
                >
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)]"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  aria-invalid={!!errors.password}
                  className={`${inputClass(!!errors.password)} pr-11`}
                  {...register("password")}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-[var(--color-danger)]">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-[var(--color-text-muted)]">
            Authorized MyPageSEO administrators only.
          </p>
        </div>
      </main>
    </div>
  );
}
