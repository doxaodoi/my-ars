"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import type { Role } from "@prisma/client";

interface MobileSidebarProps {
  role: Role;
  userName: string;
}

export function MobileSidebar({ role, userName }: MobileSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Auto-close drawer when navigating
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Fixed top bar — visible only on mobile */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 bg-background border-b md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="ml-3 flex items-center gap-2 min-w-0">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-7 h-7 rounded object-contain"
          />
          <span className="font-semibold text-sm text-foreground truncate">
            MyARS Connect
          </span>
        </div>
      </div>

      {/* Slide-in drawer with sidebar content */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-64 sm:max-w-[16rem]" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar role={role} userName={userName} />
        </SheetContent>
      </Sheet>
    </>
  );
}
