import { h, ComponentChildren, VNode, cloneElement, isValidElement, toChildArray } from "preact";
import { useEffect, useState, useId } from "preact/hooks";
import { FormError } from "./FormError";

export interface FieldWrapperProps {
  helperTextId?: string;
  label: string;
  error?: string;
  helperText?: ComponentChildren;
  children: ComponentChildren;
  htmlFor?: string;
  required?: boolean;
  forceTouch?: boolean;
  valid?: boolean;
}

export function FieldWrapper({ label, error, children, htmlFor, required, helperTextId, helperText, forceTouch, valid }: FieldWrapperProps) {
  const [shake, setShake] = useState(false);
  const [touched, setTouched] = useState(false);

  const generatedId = useId();
  const inputId = htmlFor ?? generatedId;
  const showError = (touched || !!forceTouch) && !!error;
  const errorId = showError ? `${inputId}-error` : undefined;
  const actualHelperId = helperText ? (helperTextId || `${inputId}-helper`) : helperTextId;

  const [previousError, setPreviousError] = useState<string | undefined>(undefined);
  const [previousShowError, setPreviousShowError] = useState<boolean>(false);

  useEffect(() => {
    let timer: any;

    if (showError && (error !== previousError || !previousShowError)) {
      setShake(true);
      timer = setTimeout(() => {
        setShake(false);
      }, 400); // Must be slightly longer than animation duration
      setPreviousError(error);
      setPreviousShowError(true);
    } else if (!showError) {
      if (previousError !== undefined) setPreviousError(undefined);
      if (previousShowError) setPreviousShowError(false);
    }

    return () => {
        if (timer) clearTimeout(timer);
    }
  }, [showError, error]); // ONLY depend on the current values to avoid re-triggering from state setter delays

  // Combine multiple aria-describedby ids if needed
  let ariaDescribedBy: string | undefined = undefined;
  const ids = [actualHelperId, showError ? errorId : undefined].filter(Boolean);
  if (ids.length > 0) {
    ariaDescribedBy = ids.join(' ');
  }

  // Clone children to append aria attributes if valid
  const childrenArray = toChildArray(children);
  const mappedChildren = childrenArray.map(child => {
    if (!isValidElement(child)) return child;
    const existingProps = child.props as any;
    const existingOnBlur = existingProps.onBlur;

    // Combine existing aria-describedby with our new one if present
    const combinedAriaDescribedBy = [existingProps["aria-describedby"], ariaDescribedBy].filter(Boolean).join(" ") || undefined;

    return cloneElement(child as VNode<any>, {
      id: existingProps.id || inputId,
      "aria-invalid": showError ? true : undefined,
      ...(combinedAriaDescribedBy ? { "aria-describedby": combinedAriaDescribedBy } : {}),
      "aria-errormessage": errorId,
      ...(required || existingProps["aria-required"] ? { "aria-required": true } : {}),
      onBlur: (e: any) => {
        setTouched(true);
        existingOnBlur?.(e);
      },
      valid: !error ? valid : undefined,
    });
  });

  return (
    <div class="flex flex-col mb-4">
      <label htmlFor={inputId} class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex gap-1">
        {label}
        {required && <span class="text-status-red" aria-hidden="true">*</span>}
        {required && <span class="sr-only">(required)</span>}
      </label>
      <div
        class={`
          relative rounded-md
          ${shake && showError ? 'motion-safe:animate-form-shake' : ''}
          ${showError ? 'ring-1 ring-status-red transition-shadow duration-200 ease-in-out' : 'transition-shadow duration-200 ease-in-out'}
        `}
      >
        <div class={`
          [&_input]:transition-colors [&_input]:duration-200 [&_input]:ease-in-out
          [&_textarea]:transition-colors [&_textarea]:duration-200 [&_textarea]:ease-in-out
          ${showError ? '[&_input]:border-status-red [&_textarea]:border-status-red [&_input]:ring-status-red [&_textarea]:ring-status-red' : ''}
        `}>
          {mappedChildren}
        </div>
      </div>
      <FormError error={showError ? error : undefined} id={errorId} helperText={helperText as string} helperId={actualHelperId} />
    </div>
  );
}
