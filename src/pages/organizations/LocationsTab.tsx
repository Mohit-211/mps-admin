import { Link } from "react-router-dom";

import type { OrganizationDetail } from "../../api/organizations";
import { useAuth } from "../../auth/useAuth";
import { Badge } from "../../components/ui/Badge";
import { humanize } from "../../lib/format";

/**
 * The organization's active locations. There's no admin view of a location's ranking or GBP pages
 * (customer routes only); reports show their data, and citations link to the location's list.
 */
export function LocationsTab({ detail }: { detail: OrganizationDetail }) {
  const { can } = useAuth();
  const canCitations = can("citations.view");
  const l = detail.billing.locations;

  return (
    <div>
      <p className="border-b border-[var(--color-border-light)] px-5 py-3 text-sm text-[var(--color-text-secondary)]">
        {l.active} active of {l.allowed} allowed{l.free > 0 ? `, ${l.free} of them free` : ""} · cap {l.max ?? "none"}
      </p>
      <div className="table-scroll">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-5 py-2.5">Location</th>
              <th className="px-5 py-2.5">City</th>
              <th className="px-5 py-2.5">Google Business Profile</th>
              <th className="px-5 py-2.5">Added via</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {detail.locations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[var(--color-text-muted)]">
                  No active locations.
                </td>
              </tr>
            ) : (
              detail.locations.map((loc) => (
                <tr key={loc.id} className="border-t border-[var(--color-border-light)] text-[var(--color-text-secondary)]">
                  <td className="px-5 py-3 font-medium text-[var(--color-text-primary)]">{loc.name}</td>
                  <td className="px-5 py-3">{loc.city ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge tone={loc.gbp_connected ? "green" : "gray"}>{loc.gbp_connected ? "Connected" : "Not connected"}</Badge>
                  </td>
                  <td className="px-5 py-3">{loc.source ? humanize(loc.source) : "—"}</td>
                  <td className="px-5 py-3 text-right">
                    {canCitations && (
                      <Link
                        to={`/citations/locations/${loc.id}`}
                        className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                      >
                        Citations
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
