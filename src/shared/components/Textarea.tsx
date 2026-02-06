
import { TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { inputBase, inputError, inputDefault, labelBase, errorText } from './tw';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const reactId = useId();
    const textareaId = props.id ?? props.name ?? reactId;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText && !error ? `${textareaId}-help` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className={labelBase}>
            {label}
            {props.required && <span className="text-danger-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
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

Textarea.displayName = 'Textarea';
