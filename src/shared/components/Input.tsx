
import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { inputBase, inputError, inputDefault, labelBase, errorText, helperText } from './tw';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const reactId = useId();
    const inputId = props.id ?? props.name ?? reactId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText && !error ? `${inputId}-help` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className={labelBase}>
            {label}
            {props.required && <span className="text-danger-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={[
            inputBase,
            error ? inputError : inputDefault,
            className
          ].join(' ')}
          {...props}
        />
        {error && (
          <p id={errorId} className={errorText}>{error}</p>
        )}
        {helperText && !error && (
          <p id={helperId} className={helperText}>{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
