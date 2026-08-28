import AppLayout from "@/app/components/layout/AppLayout";
import DevShopStore from "./DevShopStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DevShopPage() {
  return (
    <AppLayout>
      <DevShopStore />
    </AppLayout>
  );
}
