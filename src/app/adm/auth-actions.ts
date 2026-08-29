"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(prevState: { error?: string } | null, formData: FormData) {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Informe e-mail e senha para continuar." };
  }

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { error: "Credenciais inválidas ou usuário inexistente." };
  }

  // Verify if the user is an authorized admin via is_dante_admin RPC
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_dante_admin");

  if (adminError || !isAdmin) {
    await supabase.auth.signOut();
    return {
      error:
        "Acesso negado: esta conta não possui privilégios de administrador no Ajude o Dante.",
    };
  }

  revalidatePath("/adm", "layout");
  redirect("/adm");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/adm", "layout");
  redirect("/adm/login");
}
