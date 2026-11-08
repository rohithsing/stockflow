const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const number = new Intl.NumberFormat('en-IN');

export const formatMoney = (value) =>
  value === null || value === undefined ? '--' : currency.format(value);

export const formatNumber = (value) => number.format(value ?? 0);

export const formatDateTime = (value) => {
  if (!value) return '--';
  // SQLite stores UTC without a zone marker; tell Date explicitly.
  const date = new Date(value.replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime())
    ? '--'
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};
