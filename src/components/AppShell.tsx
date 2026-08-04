"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import IngestionModal from "./IngestionModal";
import CommandPalette from "./CommandPalette";
import { ToastProvider } from "./ToastContext";
import { SessionUser } from "@/lib/auth";

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export default function AppShell({ user, children }: AppShellProps) {
  const [isIngestOpen, setIsIngestOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased">
        {/* Sidebar Navigation */}
        <Sidebar
          userRole={user.role}
          onOpenIngest={() => setIsIngestOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar user={user} />
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
        </div>

        {/* Global Ingestion Modal */}
        <IngestionModal
          isOpen={isIngestOpen}
          onClose={() => setIsIngestOpen(false)}
          onSuccess={() => {
            setIsIngestOpen(false);
            window.location.reload();
          }}
        />

        {/* Global Command Palette (Cmd + K) */}
        <CommandPalette onOpenIngestModal={() => setIsIngestOpen(true)} />
      </div>
    </ToastProvider>
  );
}
