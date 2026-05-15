import { auth } from "@/lib/auth";
import { ChangePasswordForm } from "./_components/ChangePasswordForm";

export default async function SettingsPage() {
  const session = await auth();
  const user = session!.user;

  return (
    <div className="p-6 max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Account</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your profile and security settings
        </p>
      </div>

      {/* Profile info */}
      <div className="border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-foreground">Profile</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium">{user.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Role</p>
            <p className="font-medium capitalize">
              {user.role.replace(/_/g, " ").toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Password change */}
      <ChangePasswordForm />
    </div>
  );
}
