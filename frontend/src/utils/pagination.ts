import type { TablePaginationConfig } from 'antd';

/** Shared table pagination: off for short lists, paged (with a size picker and range) for long ones. */
export function tablePagination(total: number, defaultPageSize = 20): TablePaginationConfig | false {
  if (total <= 10) return false;
  return {
    defaultPageSize,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50, 100],
    showTotal: (t, [from, to]) => `${from}–${to} of ${t}`,
    size: 'small',
  };
}
