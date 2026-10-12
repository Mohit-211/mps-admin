import { Download } from "lucide-react";
import { useState, type MouseEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { ApiError, downloadFile, errorMessage } from "../../lib/api";
import { Button } from "./Button";

type DownloadButtonProps = {
  path: string;
  filename: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  children?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  title?: string;
  /** Friendly messages for a 409's data.reason (e.g. not_ready). */
  reasons?: Record<string, string>;
};

/** Downloads a PDF / CSV with the auth header (a plain link would get a 401). */
export function DownloadButton({
  path,
  filename,
  query,
  children = "Download PDF",
  variant = "secondary",
  size = "sm",
  disabled,
  title,
  reasons,
}: DownloadButtonProps) {
  const [busy, setBusy] = useState(false);

  const download = async (event: MouseEvent) => {
    event.stopPropagation();
    setBusy(true);
    try {
      await downloadFile(path, filename, { query });
    } catch (error) {
      const reason = error instanceof ApiError ? error.reason : undefined;
      toast.error((reason && reasons?.[reason]) || errorMessage(error, "Couldn't download the file."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={download} loading={busy} disabled={disabled} title={title}>
      {!busy && <Download size={15} />}
      {children}
    </Button>
  );
}
