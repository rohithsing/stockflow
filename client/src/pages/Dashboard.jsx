import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatMoney, formatNumber } from '../lib/format.js';
import { PageLoader } from '../components/Spinner.jsx';
import { Alert } from '../components/Alert.jsx';
import { EmptyState } from '../components/EmptyState.jsx';

function StatCard({ label, value, caption }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {caption && <p className="mt-1 text-xs text-slate-500">{caption}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <PageLoader label="Loading your dashboard..." />;

  const { totals, lowStockItems, defaultLowStockThreshold } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Inventory snapshot for {data.organizationName}.
          </p>
        </div>
        <Link to="/products/new" className="btn-primary">
          Add product
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Products" value={formatNumber(totals.productCount)} caption="Total SKUs tracked" />
        <StatCard
          label="Units on hand"
          value={formatNumber(totals.totalUnits)}
          caption="Across every product"
        />
        <StatCard
          label="Low stock"
          value={formatNumber(totals.lowStockCount)}
          caption={`Default threshold: ${defaultLowStockThreshold}`}
        />
        <StatCard
          label="Retail value"
          value={formatMoney(totals.retailValue)}
          caption="Units x selling price"
        />
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Low stock items</h2>
            <p className="text-sm text-slate-500">
              Quantity on hand is at or below the product&apos;s threshold.
            </p>
          </div>
          <Link to="/products" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View all products
          </Link>
        </div>

        {lowStockItems.length === 0 ? (
          <EmptyState
            title="Nothing is running low"
            description="Every product is above its low stock threshold right now."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 text-right font-medium">Quantity on hand</th>
                  <th className="px-5 py-3 text-right font-medium">Low stock threshold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        to={`/products/${item.id}`}
                        className="font-medium text-slate-900 hover:text-indigo-600"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{item.sku}</td>
                    <td className="px-5 py-3 text-right font-semibold text-amber-700">
                      {formatNumber(item.quantityOnHand)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {formatNumber(item.effectiveLowStockThreshold)}
                      {item.usesDefaultThreshold && (
                        <span className="ml-1 text-xs text-slate-400">(default)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
