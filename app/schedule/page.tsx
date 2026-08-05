import AppLayout from "@/app/components/layout/AppLayout";
import ScheduleClient from "./ScheduleClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SchedulePage() {
  return (
    <AppLayout>
      <ScheduleClient />
    </AppLayout>
  );
}
