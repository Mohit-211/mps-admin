import { Copy, Eye, EyeOff, Wand2 } from "lucide-react";
import { useState } from "react";
import type { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";

import { generatePassword, PASSWORD_HINT } from "../../lib/password";
import { Button } from "./Button";
import { Field } from "./Field";
import { inputClass } from "./fieldStyles";

type PasswordValues = { password?: string; confirm_password?: string };

/** Password + confirm with show/hide, Generate and Copy. For forms whose fields are named password / confirm_password. */
export function PasswordFields<T extends PasswordValues>({
  idPrefix,
  register,
  setValue,
  errors,
  getPassword,
}: {
  idPrefix: string;
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
  errors: FieldErrors<T>;
  getPassword: () => string;
}) {
  const [show, setShow] = useState(false);
  // react-hook-form's generic paths don't narrow on a constrained T; these two names always exist.
  const reg = register as unknown as UseFormRegister<PasswordValues>;
  const set = setValue as unknown as UseFormSetValue<PasswordValues>;
  const errs = errors as FieldErrors<PasswordValues>;

  const copy = async () => {
    const value = getPassword();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Password copied.");
    } catch {
      toast.error("Couldn't copy. Select the password and copy it manually.");
    }
  };

  return (
    <div className="space-y-4">
      <Field label="Password" htmlFor={`${idPrefix}-password`} error={errs.password?.message} hint={PASSWORD_HINT}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id={`${idPrefix}-password`}
              type={show ? "text" : "password"}
              autoComplete="new-password"
              className={`${inputClass} pr-10`}
              aria-invalid={!!errs.password}
              {...reg("password")}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Button
            variant="secondary"
            title="Generate a strong password"
            onClick={() => {
              const generated = generatePassword();
              set("password", generated, { shouldValidate: true });
              set("confirm_password", generated, { shouldValidate: true });
              setShow(true);
            }}
          >
            <Wand2 size={15} />
            <span className="hidden sm:inline">Generate</span>
          </Button>
          <Button variant="secondary" title="Copy password" aria-label="Copy password" onClick={copy}>
            <Copy size={15} />
          </Button>
        </div>
      </Field>
      <Field label="Confirm password" htmlFor={`${idPrefix}-confirm`} error={errs.confirm_password?.message}>
        <input
          id={`${idPrefix}-confirm`}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          className={inputClass}
          aria-invalid={!!errs.confirm_password}
          {...reg("confirm_password")}
        />
      </Field>
    </div>
  );
}
