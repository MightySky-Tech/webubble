import { useId, type InputHTMLAttributes } from "react";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "children"> {
  label: string;
  /** Guidance shown under the label, e.g. "We'll text you a code". */
  hint?: string;
  /** Validation message. When set, the field is marked invalid and the message is announced. */
  error?: string;
  id?: string;
}

export function TextField({
  label,
  hint,
  error,
  id,
  required,
  className,
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? `wb-field-${autoId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={["wb-field", error && "wb-field--invalid", className].filter(Boolean).join(" ")}>
      <label className="wb-field__label" htmlFor={inputId}>
        {label}
        {required && (
          <span className="wb-field__required" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>
      {hint && (
        <p className="wb-field__hint" id={hintId}>
          {hint}
        </p>
      )}
      <input
        {...rest}
        id={inputId}
        className="wb-field__input"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {error && (
        <p className="wb-field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
