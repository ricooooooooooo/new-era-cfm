"use client";

import type { ReactNode } from "react";
import {
  useCallback,
  useState,
} from "react";

import Navbar from "../Navbar";
import NewsTicker from "../NewsTicker";
import Sidebar from "../Sidebar";
import PrimaryNavigation from "../navigation/PrimaryNavigation";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({
  children,
}: AppLayoutProps) {
  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const openSidebar =
    useCallback(() => {
      setSidebarOpen(true);
    }, []);

  const closeSidebar =
    useCallback(() => {
      setSidebarOpen(false);
    }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080909] text-white">
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
      />

      <PrimaryNavigation />

      <Navbar
        onMenuClick={openSidebar}
      />

      <div className="sticky top-16 z-30 lg:ml-20">
        <NewsTicker />
      </div>

      <main className="min-w-0 overflow-x-hidden pb-[82px] lg:ml-20 lg:pb-0">
        {children}
      </main>
    </div>
  );
}
