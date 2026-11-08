import { useEffect, useState } from 'react';
import { Field, TextInput } from './Field.jsx';
import { Alert } from './Alert.jsx';
import { Spinner } from './Spinner.jsx';
import { api, ApiError } from '../lib/api.js';

/** Quick "+/- N units" control used from the product list and detail pages. */
export function AdjustStockDialog({ product, onClose, onSaved }) {
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  if (!product) return null;

  const parsed = Number(delta);
  const preview =
    delta !== '' && Number.isFinite(parsed) ? product.quantityOnHand + Math.trunc(parsed) : null;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      const data = await api.post(`/products/${product.id}/adjust`, { delta, note });
      onSaved(data.product);
    } catch (err) {
      setError(err.message);
      if (err instanceof ApiError) setFields(err.fields);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={() => !busy && onClose()} />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"
        noValidate
      >
        <div>
          <h2 className="text-base font-semibold text-slate-900">Adjust stock</h2>
          <p className="mt-1 text-sm text-slate-500">
            {product.name} - currently {product.quantityOnHand} unit(s) on hand.
          </p>
        </div>

        <Alert>{error}</Alert>

        <Field
          label="Change in units"
          htmlFor="delta"
          error={fields.delta}
          hint={
            preview === null
              ? 'Use a negative number to remove units, e.g. -3'
              : `New quantity on hand: ${preview}`
          }
        >
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary px-3"
              onClick={() => setDelta(String((Number(delta) || 0) - 1))}
              aria-label="Decrease by one"
            >
              -
            </button>
            <TextInput
              id="delta"
              type="number"
              step="1"
              inputMode="numeric"
              placeholder="e.g. 10 or -3"
              value={delta}
              onChange={(event) => setDelta(event.target.value)}
              error={fields.delta}
              autoFocus
            />
            <button
              type="button"
              className="btn-secondary px-3"
              onClick={() => setDelta(String((Number(delta) || 0) + 1))}
              aria-label="Increase by one"
            >
              +
            </button>
          </div>
        </Field>

        <Field label="Note (optional)" htmlFor="note" error={fields.note}>
          <TextInput
            id="note"
            placeholder="Received shipment, damaged unit, stock count..."
            value={note}
            onChange={(event) => setNote(event.target.value)}
            error={fields.note}
          />
        </Field>

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Spinner className="h-4 w-4 text-white" />}
            Save adjustment
          </button>
        </div>
      </form>
    </div>
  );
}
