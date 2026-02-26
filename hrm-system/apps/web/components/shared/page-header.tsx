export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }): React.JSX.Element {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        {description && <p className="text-sm text-[var(--muted-text)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
