import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./components/Dashboard";
import QuickActions from "./components/QuickActions";
import Intro from "./components/Intro/Intro";

export default function Home() {
  return (
    <Intro>
      <AppLayout>
        <Dashboard />
        <QuickActions />
      </AppLayout>
    </Intro>
  );
}