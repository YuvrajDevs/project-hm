import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

// Private: for the owners only. Kept out of search results; the data itself is guarded by /api/admin/stats.
export const metadata: Metadata = {
  title: "Owner view",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
