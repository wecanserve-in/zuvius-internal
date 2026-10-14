import { Link } from 'react-router-dom'

export function StatStrip({
  items,
}: {
  items: { label: string; value: number | string; href?: string }[]
}) {
  return (
    <div className="flex flex-wrap gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)]">
      {items.map((item) => {
        const inner = (
          <div className="min-w-[7rem] flex-1 bg-[var(--color-card)] px-4 py-3">
            <p className="text-xs text-[var(--color-muted-foreground)]">{item.label}</p>
            <p className="text-lg font-semibold tabular-nums">{item.value}</p>
          </div>
        )
        return item.href ? (
          <Link key={item.label} to={item.href} className="flex-1 hover:bg-[var(--color-muted)]/40">
            {inner}
          </Link>
        ) : (
          <div key={item.label} className="flex-1">{inner}</div>
        )
      })}
    </div>
  )
}
