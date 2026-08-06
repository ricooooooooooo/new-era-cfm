import AppLayout from "@/app/components/layout/AppLayout";
import MaddenSyncClient from "./MaddenSyncClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CommissionerMaddenSyncPage() {
  return (
    <AppLayout>
      <MaddenSyncClient />
    </AppLayout>
  );
}
