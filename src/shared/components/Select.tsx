
import { SelectHTMLAttributes, forwardRef, useId } from 'react';
import { inputBase, inputError, inputDefault, labelBase, errorText, helperText } from './tw';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string | number; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = '', ...props }, ref) => {
    const reactId = useId();
    const selectId = props.id ?? props.name ?? reactId;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText && !error ? `${selectId}-help` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className={labelBase}>
            {label}
            {props.required && <span className="text-danger-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={[
            inputBase,
            error ? inputError : inputDefault,
            className
          ].join(' ')}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

Select.displayName = 'Select';
