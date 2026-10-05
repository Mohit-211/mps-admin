import {
  Building2,
  FileBarChart,
  Users,
  CreditCard,
} from "lucide-react";

import { StatCard } from "../../components/ui/StatCard";
import {
  dashboardStats,
  recentActivity,
  recentRegistrations,
  subscriptionBreakdown,
  userGrowth,
} from "../../data/dashboard";

export function DashboardPage() {
  const icons = [Users, Building2, CreditCard, FileBarChart];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Dashboard</h1>
          <p className="page-header__description">
            A quick operational overview of the MyPageSEO platform.
          </p>
        </div>

        <div className="text-xs text-[var(--color-text-muted)]">
          Updated just now
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat, index) => (
          <StatCard key={stat.label} {...stat} icon={icons[index]} />
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="surface p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                User growth
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Total registered users over the last six months
              </p>
            </div>

            <span className="rounded-md bg-[var(--color-primary-light)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)]">
              +8.4%
            </span>
          </div>

          <div className="mt-7 flex h-56 items-end gap-3">
            {userGrowth.map((item) => {
              const height = Math.max(16, (item.users / 3000) * 100);

              return (
                <div
                  key={item.month}
                  className="flex min-w-0 flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-[var(--color-primary)] transition-opacity hover:opacity-80"
                      style={{ height: `${height}%` }}
                      title={`${item.users.toLocaleString()} users`}
                    />
                  </div>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Subscription breakdown
          </h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Current organization subscription states
          </p>

          <div className="mt-7 space-y-5">
            {subscriptionBreakdown.map((item) => {
              const total = subscriptionBreakdown.reduce(
                (sum, entry) => sum + entry.value,
                0,
              );
              const percentage = Math.round((item.value / total) * 100);

              return (
                <div key={item.name}>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--color-text-secondary)]">
                      {item.name}
                    </span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {item.value}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)]"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="surface">
          <div className="border-b border-[var(--color-border-light)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Recent registrations
            </h2>
          </div>

          <div className="divide-y divide-[var(--color-border-light)]">
            {recentRegistrations.map((registration) => (
              <div
                key={registration.name}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                    {registration.name}
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {registration.owner} · {registration.type}
                  </div>
                </div>

                <div className="shrink-0 text-xs text-[var(--color-text-muted)]">
                  {registration.joined}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface">
          <div className="border-b border-[var(--color-border-light)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Recent activity
            </h2>
          </div>

          <div className="divide-y divide-[var(--color-border-light)]">
            {recentActivity.map((activity) => (
              <div key={`${activity.action}-${activity.subject}`} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">
                      {activity.action}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {activity.subject}
                    </div>
                  </div>

                  <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
                    {activity.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
