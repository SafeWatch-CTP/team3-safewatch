import Link from "next/link";
import { CATEGORY_LABELS } from "./labels";

// Links, not state: the choice lives in the URL so it can be shared, survives
// a reload, and works before any JavaScript arrives.
export function CategoryFilter({ current }: { current: string | undefined }) {
  const options = [
    { value: undefined, label: "All", href: "/incident_feed" },
    ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
      value,
      label,
      href: `/incident_feed?category=${value}`,
    })),
  ];

  return (
    <nav aria-label="Filter by category">
      <ul className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-1">
        {options.map((option) => {
          const isCurrent = option.value === current;
          return (
            <li key={option.label} className="shrink-0">
              <Link
                href={option.href}
                aria-current={isCurrent ? "true" : undefined}
                className={`block rounded-full border px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  isCurrent
                    ? "border-transparent bg-accent font-semibold text-white"
                    : "border-border bg-surface text-fg hover:bg-tint"
                }`}
              >
                {option.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
