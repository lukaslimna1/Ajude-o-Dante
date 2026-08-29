import { createClient } from "@/lib/supabase/server";
import AdmNav from "./adm-nav";

export default async function AdmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userEmail = user?.email || "Administrador";

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      <AdmNav userEmail={userEmail} />

      {/* Main Content Area (Offset for desktop sidebar) */}
      <main className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
