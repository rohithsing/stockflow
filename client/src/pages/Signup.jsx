import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell.jsx';
import { Field, TextInput } from '../components/Field.jsx';
import { Alert } from '../components/Alert.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../lib/auth.jsx';
import { ApiError } from '../lib/api.js';

const EMPTY = { organizationName: '', email: '', password: '', confirmPassword: '' };

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
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
      await signup(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      if (err instanceof ApiError) setFields(err.fields);
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Your organization and inventory are set up in one step."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Alert>{error}</Alert>

        <Field
          label="Organization name"
          htmlFor="organizationName"
          error={fields.organizationName}
          hint="For example: My Test Store"
        >
          <TextInput
            id="organizationName"
            value={form.organizationName}
            onChange={update('organizationName')}
            error={fields.organizationName}
            placeholder="My Test Store"
            required
          />
        </Field>

        <Field label="Email" htmlFor="email" error={fields.email}>
          <TextInput
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            error={fields.email}
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={fields.password}
          hint="At least 8 characters."
        >
          <TextInput
            id="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update('password')}
            error={fields.password}
            required
          />
        </Field>

        <Field label="Confirm password" htmlFor="confirmPassword" error={fields.confirmPassword}>
          <TextInput
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            error={fields.confirmPassword}
            required
          />
        </Field>

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <Spinner className="h-4 w-4 text-white" />}
          Create account
        </button>
      </form>
    </AuthShell>
  );
}
