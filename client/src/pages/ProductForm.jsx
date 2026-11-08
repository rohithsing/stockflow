import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { Field, TextInput } from '../components/Field.jsx';
import { Alert } from '../components/Alert.jsx';
import { Spinner, PageLoader } from '../components/Spinner.jsx';
import { StockBadge } from '../components/StockBadge.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { formatDateTime, formatNumber } from '../lib/format.js';

const EMPTY = {
  name: '',
  sku: '',
  description: '',
  quantityOnHand: '0',
  costPrice: '',
  sellingPrice: '',
  lowStockThreshold: '',
};

const toFormValues = (product) => ({
  name: product.name ?? '',
  sku: product.sku ?? '',
  description: product.description ?? '',
  quantityOnHand: String(product.quantityOnHand ?? 0),
  costPrice: product.costPrice === null ? '' : String(product.costPrice),
  sellingPrice: product.sellingPrice === null ? '' : String(product.sellingPrice),
  lowStockThreshold:
    product.lowStockThreshold === null ? '' : String(product.lowStockThreshold),
});

/** Doubles as the create form, the edit form and the product detail view. */
export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id !== undefined;

  const [form, setForm] = useState(EMPTY);
  const [product, setProduct] = useState(null);
  const [defaultThreshold, setDefaultThreshold] = useState(5);
  const [loading, setLoading] = useState(isEdit);
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get('/settings')
      .then((data) => setDefaultThreshold(data.settings.defaultLowStockThreshold))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    api
      .get(`/products/${id}`)
      .then((data) => {
        setProduct(data.product);
        setForm(toFormValues(data.product));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setFields({});

    try {
      if (isEdit) {
        const data = await api.patch(`/products/${id}`, form);
        setProduct(data.product);
        setForm(toFormValues(data.product));
        setNotice('Changes saved.');
      } else {
        await api.post('/products', form);
        navigate('/products', { replace: true });
        return;
      }
    } catch (err) {
      setError(err.message);
      if (err instanceof ApiError) setFields(err.fields);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/products/${id}`);
      navigate('/products', { replace: true });
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  if (loading) return <PageLoader label="Loading product..." />;
  if (isEdit && !product && error) return <Alert>{error}</Alert>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/products" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          &larr; Back to products
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {isEdit ? product?.name : 'Add product'}
          </h1>
          {isEdit && product && <StockBadge isLowStock={product.isLowStock} />}
        </div>
        {isEdit && product && (
          <p className="mt-1 text-sm text-slate-500">
            {formatNumber(product.quantityOnHand)} on hand &middot; last updated{' '}
            {formatDateTime(product.updatedAt)}
            {product.lastUpdatedBy ? ` by ${product.lastUpdatedBy}` : ''}
          </p>
        )}
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {isEdit && product?.lastAdjustmentNote && (
        <Alert tone="info">Last stock note: {product.lastAdjustmentNote}</Alert>
      )}

      <form className="card space-y-5 p-6" onSubmit={onSubmit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={fields.name}>
            <TextInput
              id="name"
              value={form.name}
              onChange={update('name')}
              error={fields.name}
              placeholder="Blue cotton t-shirt"
              required
            />
          </Field>

          <Field
            label="SKU"
            htmlFor="sku"
            error={fields.sku}
            hint="Must be unique within your organization."
          >
            <TextInput
              id="sku"
              value={form.sku}
              onChange={update('sku')}
              error={fields.sku}
              placeholder="TSH-BLU-M"
              required
            />
          </Field>
        </div>

        <Field label="Description (optional)" htmlFor="description" error={fields.description}>
          <textarea
            id="description"
            rows={3}
            className={`input ${fields.description ? 'input-error' : ''}`}
            value={form.description}
            onChange={update('description')}
            placeholder="Anything worth remembering about this product"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Quantity on hand" htmlFor="quantityOnHand" error={fields.quantityOnHand}>
            <TextInput
              id="quantityOnHand"
              type="number"
              step="1"
              min="0"
              inputMode="numeric"
              value={form.quantityOnHand}
              onChange={update('quantityOnHand')}
              error={fields.quantityOnHand}
              required
            />
          </Field>

          <Field label="Cost price" htmlFor="costPrice" error={fields.costPrice}>
            <TextInput
              id="costPrice"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={form.costPrice}
              onChange={update('costPrice')}
              error={fields.costPrice}
              placeholder="Optional"
            />
          </Field>

          <Field label="Selling price" htmlFor="sellingPrice" error={fields.sellingPrice}>
            <TextInput
              id="sellingPrice"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={form.sellingPrice}
              onChange={update('sellingPrice')}
              error={fields.sellingPrice}
              placeholder="Optional"
            />
          </Field>

          <Field
            label="Low stock threshold"
            htmlFor="lowStockThreshold"
            error={fields.lowStockThreshold}
            hint={`Leave blank to use the default (${defaultThreshold}).`}
          >
            <TextInput
              id="lowStockThreshold"
              type="number"
              step="1"
              min="0"
              inputMode="numeric"
              value={form.lowStockThreshold}
              onChange={update('lowStockThreshold')}
              error={fields.lowStockThreshold}
              placeholder={String(defaultThreshold)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          {isEdit ? (
            <button
              type="button"
              className="text-sm font-medium text-rose-600 hover:text-rose-700"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete this product
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-3">
            <Link to="/products" className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy && <Spinner className="h-4 w-4 text-white" />}
              {isEdit ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete product"
        message={`"${product?.name}" and its stock level will be removed permanently. This cannot be undone.`}
        confirmLabel="Delete product"
        busy={deleting}
        onConfirm={onDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
