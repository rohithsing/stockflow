export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ error, className = '', ...props }) {
  return <input className={`input ${error ? 'input-error' : ''} ${className}`} {...props} />;
}
