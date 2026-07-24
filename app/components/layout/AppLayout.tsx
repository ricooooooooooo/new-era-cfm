"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#080909] text-white">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="min-w-0 overflow-x-hidden lg:ml-72">
        {children}
      </main>
    </div>
  );
}