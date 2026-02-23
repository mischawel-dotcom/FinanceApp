import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { inputBase, inputError, inputDefault, labelBase, errorText as errorTextClass } from './tw';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  value?: string | number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  onChange?: (e: { target: { value: string; name: string } }) => void;
}

export function Select({
  label,
  error,
  helperText,
  options,
  value,
  required,
  disabled,
  className = '',
  id,
  name,
  onChange,
}: SelectProps) {
  const reactId = useId();
  const selectId = id ?? name ?? reactId;
  const errorId = error ? `${selectId}-error` : undefined;
  const helperId = helperText && !error ? `${selectId}-help` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((o) => String(o.value) === String(value));
  const displayLabel = selectedOption?.label ?? '';

  const close = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen && listRef.current && focusedIndex >= 0) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      (items[focusedIndex] as HTMLElement)?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex, isOpen]);

  const handleSelect = (option: SelectOption) => {
    onChange?.({ target: { value: String(option.value), name: name ?? '' } });
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          handleSelect(options[focusedIndex]);
        } else {
          setIsOpen(true);
          const currentIdx = options.findIndex((o) => String(o.value) === String(value));
          setFocusedIndex(currentIdx >= 0 ? currentIdx : 0);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          const currentIdx = options.findIndex((o) => String(o.value) === String(value));
          setFocusedIndex(currentIdx >= 0 ? currentIdx : 0);
        } else {
          setFocusedIndex((prev) => Math.min(prev + 1, options.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      close();
    } else {
      setIsOpen(true);
      const currentIdx = options.findIndex((o) => String(o.value) === String(value));
      setFocusedIndex(currentIdx >= 0 ? currentIdx : 0);
    }
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && (
        <label htmlFor={selectId} className={labelBase}>
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      <button
        type="button"
        id={selectId}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={!!error}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={[
          inputBase,
          error ? inputError : inputDefault,
          'flex items-center justify-between text-left cursor-pointer',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
          className,
        ].join(' ')}
      >
        <span className={displayLabel ? '' : 'text-gray-400 dark:text-gray-500'}>
          {displayLabel || 'Auswählen…'}
        </span>
        <svg
          className={`w-4 h-4 ml-2 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-1"
        >
          {options.map((option, idx) => {
            const isSelected = String(option.value) === String(value);
            const isFocused = idx === focusedIndex;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={[
                  'px-3 py-2.5 text-sm cursor-pointer transition-colors',
                  isFocused
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-900 dark:text-gray-100',
                  isSelected ? 'font-semibold' : '',
                ].join(' ')}
              >
                <span className="flex items-center justify-between">
                  {option.label}
                  {isSelected && (
                    <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p id={errorId} className={errorTextClass}>{error}</p>
      )}
      {helperText && !error && (
        <p id={helperId} className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
}

Select.displayName = 'Select';
