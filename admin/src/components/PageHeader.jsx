export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="px-4 md:px-8 pt-5 md:pt-7 pb-4 md:pb-5 border-b border-slate-200 bg-white">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-ink leading-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 md:mt-2 text-sm text-muted">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}
