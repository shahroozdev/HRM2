export function EmptyState({ title, description }: { title: string; description: string }): React.JSX.Element {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
      <svg viewBox="0 0 120 80" className="mx-auto mb-4 h-20 w-28" fill="none">
        <rect x="8" y="10" width="104" height="60" rx="10" fill="#E2E8F0" />
        <rect x="20" y="24" width="80" height="8" rx="4" fill="#CBD5E1" />
        <rect x="20" y="40" width="56" height="8" rx="4" fill="#CBD5E1" />
      </svg>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}