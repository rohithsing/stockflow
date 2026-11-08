import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell.jsx';
import { Field, TextInput } from '../components/Field.jsx';
import { Alert } from '../components/Alert.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../lib/auth.jsx';
import { ApiError } from '../lib/api.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      await login(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      if (err instanceof ApiError) setFields(err.fields);
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back. Pick up where you left off."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-700">
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Alert>{error}</Alert>

        <Field label="Email" htmlFor="email" error={fields.email}>
          <TextInput
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={update('email')}
            error={fields.email}
            required
          />
        </Field>

        <Field label="Password" htmlFor="password" error={fields.password}>
          <TextInput
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="********"
            value={form.password}
            onChange={update('password')}
            error={fields.password}
            required
          />
        </Field>

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <Spinner className="h-4 w-4 text-white" />}
          Sign in
        </button>
      </form>
    </AuthShell>
  );
}
