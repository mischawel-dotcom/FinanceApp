
import { ReactNode } from 'react';
import { tableBase, tableHead, tableHeaderCell, tableBody, tableRowClickable, tableCell } from './tw';

interface TableProps<T> {
  data: T[];
  columns: {
    key: string;
    label: string;
    render?: (item: T) => ReactNode;
  }[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'Keine Daten vorhanden',
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={tableBase}>
        <thead className={tableHead}>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={tableHeaderCell}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={tableBody}>
          {data.map((item, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(item)}
              className={onRowClick ? tableRowClickable : ''}
            >
              {columns.map((column) => (
                <td key={column.key} className={tableCell}>
                  {column.render ? column.render(item) : item[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
