export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="px-8 pt-7 pb-5 border-b border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink leading-none">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}
