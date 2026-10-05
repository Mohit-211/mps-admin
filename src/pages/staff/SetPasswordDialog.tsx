import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { adminsApi } from "../../api/admins";
import type { Admin } from "../../api/auth";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { PasswordFields } from "../../components/ui/PasswordFields";
import { ApiError, errorMessage } from "../../lib/api";
import { passwordRule } from "../../lib/password";

const schema = z
  .object({ password: passwordRule, confirm_password: z.string().min(1, "Confirm the password.") })
  .refine((v) => v.password === v.confirm_password, { path: ["confirm_password"], message: "Passwords do not match." });

type Values = z.infer<typeof schema>;

type SetPasswordDialogProps = {
  admin: Admin | null;
  onClose: () => void;
  onSaved: (admin: Admin) => void;
};

export function SetPasswordDialog(props: SetPasswordDialogProps) {
  return props.admin ? <SetPasswordForm {...props} admin={props.admin} /> : null;
}

function SetPasswordForm({ admin, onClose, onSaved }: SetPasswordDialogProps & { admin: Admin }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm_password: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const updated = await adminsApi.setPassword(admin.id, values);
      toast.success(`Password set for ${updated.name || updated.email}. They were signed out of other sessions.`);
      onSaved(updated);
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.reason === "passwords_do_not_match") {
        setError("confirm_password", { message: "Passwords do not match." });
      } else if (error instanceof ApiError && error.status === 404 && !error.reason) {
        setFormError("The server doesn't support setting passwords yet. Use “Send password reset link” instead.");
      } else {
        setFormError(errorMessage(error));
      }
    }
  });

  return (
    <Modal
      open
      onClose={isSubmitting ? () => undefined : onClose}
      title="Set password"
      description={
        <>
          For <strong>{admin.name || admin.email}</strong>. Any pending set-password or reset link stops working
          and they're signed out everywhere. Share the new password with them securely.
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="set-password-form" loading={isSubmitting}>
            Set password
          </Button>
        </>
      }
    >
      <form id="set-password-form" className="space-y-4" onSubmit={onSubmit} noValidate>
        <FormError message={formError} />
        <PasswordFields
          idPrefix="set"
          register={register}
          setValue={setValue}
          errors={errors}
          getPassword={() => getValues("password")}
        />
      </form>
    </Modal>
  );
}
