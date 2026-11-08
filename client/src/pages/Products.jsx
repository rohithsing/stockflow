import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatMoney, formatNumber } from '../lib/format.js';
import { PageLoader } from '../components/Spinner.jsx';
import { Alert } from '../components/Alert.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { StockBadge } from '../components/StockBadge.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { AdjustStockDialog } from '../components/AdjustStockDialog.jsx';

export default function Products() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [adjusting, setAdjusting] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get('/products')
      .then((data) => setProducts(data.products))
      .catch((err) => setError(err.message));
  }, []);

  // The catalogue is small in the MVP, so filtering stays on the client and stays instant.
  const visible = useMemo(() => {
    if (!products) return [];
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term)
    );
  }, [products, search]);

  const replaceProduct = (updated) => {
    setProducts((current) =>
      current.map((product) => (product.id === updated.id ? updated : product))
    );
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/products/${pendingDelete.id}`);
      setProducts((current) => current.filter((product) => product.id !== pendingDelete.id));
      setNotice(`"${pendingDelete.name}" was deleted.`);
      setPendingDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (error && !products) return <Alert>{error}</Alert>;
  if (!products) return <PageLoader label="Loading products..." />;

  const countLabel = products.length === 1 ? 'product' : 'products';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Products</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatNumber(products.length)} {countLabel} in your catalogue.
          </p>
        </div>
        <Link to="/products/new" className="btn-primary">
          Add product
        </Link>
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <label className="sr-only" htmlFor="search">
            Search products
          </label>
          <input
            id="search"
            type="search"
            className="input sm:max-w-sm"
            placeholder="Search by name or SKU"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title={products.length === 0 ? 'No products yet' : 'No matches'}
            description={
              products.length === 0
                ? 'Add your first product to start tracking stock levels.'
                : 'Try a different name or SKU.'
            }
            action={
              products.length === 0 ? (
                <Link to="/products/new" className="btn-primary">
                  Add product
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 text-right font-medium">Quantity</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Selling price</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        to={`/products/${product.id}`}
                        className="font-medium text-slate-900 hover:text-indigo-600"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{product.sku}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">
                      {formatNumber(product.quantityOnHand)}
                    </td>
                    <td className="px-5 py-3">
                      <StockBadge isLowStock={product.isLowStock} />
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {formatMoney(product.sellingPrice)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-3 whitespace-nowrap text-sm font-medium">
                        <button
                          type="button"
                          className="text-indigo-600 hover:text-indigo-700"
                          onClick={() => setAdjusting(product)}
                        >
                          Adjust
                        </button>
                        <Link
                          to={`/products/${product.id}`}
                          className="text-slate-600 hover:text-slate-800"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="text-rose-600 hover:text-rose-700"
                          onClick={() => setPendingDelete(product)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdjustStockDialog
        product={adjusting}
        onClose={() => setAdjusting(null)}
        onSaved={(updated) => {
          replaceProduct(updated);
          setAdjusting(null);
          setNotice(`Stock updated for "${updated.name}".`);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete product"
        message={`"${pendingDelete?.name}" and its stock level will be removed permanently. This cannot be undone.`}
        confirmLabel="Delete product"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
