type Status =
  | "active"
  | "trial"
  | "suspended"
  | "pending"
  | "inactive"
  | "disabled"
  | "unverified"
  | "invited";

const styles: Record<Status, string> = {
  active: "bg-[#e8f5ee] text-[#27855a]",
  trial: "bg-[#edf3f7] text-[#3478a6]",
  suspended: "bg-[#f9e9e8] text-[#c9302d]",
  disabled: "bg-[#f9e9e8] text-[#c9302d]",
  pending: "bg-[#fbf3df] text-[#a66d16]",
  unverified: "bg-[#fbf3df] text-[#a66d16]",
  invited: "bg-[#edf3f7] text-[#3478a6]",
  inactive: "bg-[#eef0f1] text-[#697477]",
};

const labels: Record<Status, string> = {
  active: "Active",
  trial: "Trial",
  suspended: "Suspended",
  disabled: "Disabled",
  pending: "Pending",
  unverified: "Unverified",
  invited: "Invited",
  inactive: "Inactive",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
