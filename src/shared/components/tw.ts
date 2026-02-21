// Centralized Tailwind utility classes for shared components
// Use these constants to keep utility classes DRY and consistent

export const inputBase = [
  'w-full',
  'px-3',
  'py-2.5',
  'border',
  'rounded-md',
  'shadow-sm',
  'text-base',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-primary-500',
  'focus:border-transparent',
  'disabled:bg-gray-100',
  'disabled:cursor-not-allowed',
].join(' ');

export const inputError = 'border-danger-500';
export const inputDefault = 'border-gray-300';

export const labelBase = 'block text-sm font-medium text-gray-700 mb-1';
export const errorText = 'mt-1 text-sm text-danger-500';
export const helperText = 'mt-1 text-sm text-gray-500';

export const cardBase = 'bg-white rounded-lg shadow-md overflow-hidden';
export const cardHeader = 'px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between';
export const cardTitle = 'text-lg font-semibold text-gray-900';
export const cardSubtitle = 'text-sm text-gray-500 mt-1';
export const cardActions = 'flex items-center gap-2';
export const cardBody = 'px-4 sm:px-6 py-3 sm:py-4';

export const modalBase = 'relative bg-white rounded-lg shadow-xl w-full max-h-[90vh] flex flex-col';
export const modalHeader = 'flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200';
export const modalTitle = 'text-xl font-semibold text-gray-900';
export const modalClose = 'text-gray-400 hover:text-gray-600 transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center';
export const modalBody = 'px-4 sm:px-6 py-4 overflow-y-auto flex-1';
export const modalFooter = 'px-4 sm:px-6 py-4 border-t border-gray-200 flex justify-end gap-3';

export const tableBase = 'min-w-full divide-y divide-gray-200';
export const tableHead = 'bg-gray-50';
export const tableHeaderCell = 'px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
export const tableBody = 'bg-white divide-y divide-gray-200';
export const tableRowClickable = 'cursor-pointer hover:bg-gray-50 transition-colors';
export const tableCell = 'px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900';
