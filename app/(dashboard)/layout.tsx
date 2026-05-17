import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop: permanent sidebar */}
      <div className="hidden md:flex">
        <Sidebar role={session.user.role} userName={session.user.name ?? "User"} />
      </div>

      {/* Mobile: hamburger top bar + slide-in drawer */}
      <MobileSidebar role={session.user.role} userName={session.user.name ?? "User"} />

      <main className="flex-1 overflow-auto bg-background pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
