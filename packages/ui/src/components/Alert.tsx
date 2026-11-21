import type { ReactNode } from "react";

export type AlertTone = "error" | "success" | "info";

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
}

/**
 * Message banner. Errors use role="alert" so screen readers announce them at once;
 * success and info use role="status" so they are announced politely.
 */
export function Alert({ tone = "info", title, children }: AlertProps) {
  return (
    <div className={`wb-alert wb-alert--${tone}`} role={tone === "error" ? "alert" : "status"}>
      {title && <p className="wb-alert__title">{title}</p>}
      <div className="wb-alert__body">{children}</div>
    </div>
  );
}
