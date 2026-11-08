import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api.js';
import { Field, TextInput } from '../components/Field.jsx';
import { Alert } from '../components/Alert.jsx';
import { Spinner, PageLoader } from '../components/Spinner.jsx';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [value, setValue] = useState('');
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get('/settings')
      .then((data) => {
        setSettings(data.settings);
        setValue(String(data.settings.defaultLowStockThreshold));
      })
      .catch((err) => setError(err.message));
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setFields({});
    try {
      const data = await api.patch('/settings', { defaultLowStockThreshold: value });
      setSettings(data.settings);
      setValue(String(data.settings.defaultLowStockThreshold));
      setNotice('Settings saved.');
    } catch (err) {
      setError(err.message);
      if (err instanceof ApiError) setFields(err.fields);
    } finally {
      setBusy(false);
    }
  };

  if (error && !settings) return <Alert>{error}</Alert>;
  if (!settings) return <PageLoader label="Loading settings..." />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Organization-wide defaults for {settings.organizationName}.
        </p>
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <form className="card space-y-5 p-6" onSubmit={onSubmit} noValidate>
        <Field
          label="Default low stock threshold"
          htmlFor="defaultLowStockThreshold"
          error={fields.defaultLowStockThreshold}
          hint="Used for any product that does not set its own threshold. A product is low stock when quantity on hand is at or below this number."
        >
          <TextInput
            id="defaultLowStockThreshold"
            type="number"
            step="1"
            min="0"
            inputMode="numeric"
            className="sm:max-w-[12rem]"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            error={fields.defaultLowStockThreshold}
            required
          />
        </Field>

        <div className="flex justify-end border-t border-slate-200 pt-5">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Spinner className="h-4 w-4 text-white" />}
            Save settings
          </button>
        </div>
      </form>
    </div>
  );
}
