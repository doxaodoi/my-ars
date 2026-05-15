"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  FileText,
  CheckSquare,
  Settings,
  LogOut,
  GraduationCap,
  Sun,
  Moon,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
};

const NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["OWNER", "ADMIN", "ACADEMIC_HEAD", "TEACHER"],
  },
  {
    href: "/students",
    label: "Students",
    icon: Users,
    roles: ["OWNER", "ADMIN", "ACADEMIC_HEAD"],
  },
  {
    href: "/classes",
    label: "Classes",
    icon: GraduationCap,
    roles: ["OWNER", "ADMIN"],
  },
  {
    href: "/subjects",
    label: "Subjects",
    icon: BookOpen,
    roles: ["OWNER", "ADMIN"],
  },
  {
    href: "/grades",
    label: "Grade Entry",
    icon: ClipboardList,
    roles: ["OWNER", "ADMIN", "TEACHER"],
  },
  {
    href: "/nursery",
    label: "Nursery / Creche",
    icon: CheckSquare,
    roles: ["OWNER", "ADMIN", "TEACHER"],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: FileText,
    roles: ["OWNER", "ADMIN", "ACADEMIC_HEAD"],
  },
  {
    href: "/admin",
    label: "Administration",
    icon: Settings,
    roles: ["OWNER", "ADMIN"],
  },
  {
    href: "/settings",
    label: "My Account",
    icon: UserCog,
    roles: ["OWNER", "ADMIN", "ACADEMIC_HEAD", "TEACHER"],
  },
];

interface SidebarProps {
  role: Role;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const visibleNav = NAV.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo / School branding */}
      <div className="relative overflow-hidden border-b border-sidebar-border">
        {/* Violet gradient header */}
        <div className="bg-primary px-5 py-4">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 ring-2 ring-white/30 bg-white flex items-center justify-center">
              <Image src="/logo.png" alt="Abundant Rain School" width={40} height={40} className="object-contain w-full h-full" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-white leading-tight truncate">
                Abundant Rain School
              </p>
              {/* Motto in gold */}
              <p className="text-xs font-medium truncate" style={{ color: "#f0c040" }}>
                ✦ Let God Arise!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {visibleNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* User info + sign out */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3 px-1">
          {/* Avatar in gold */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#d4a017" }}
          >
            <span className="text-xs font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {role.replace(/_/g, " ").toLowerCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start text-muted-foreground hover:text-destructive"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 shrink-0 text-muted-foreground"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            title="Toggle theme"
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
