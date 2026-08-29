"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ContributionRow = {
  id: string;
  donor_name: string | null;
  public_display_name: string | null;
  public_name: boolean;
  amount_cents: number | null;
  source: string;
  provider: string | null;
  status: string;
  occurred_at: string;
  pix_end_to_end_id: string | null;
  transaction_id: string | null;
  institution: string | null;
  provider_payment_id: string | null;
  dedupe_key: string;
  notes: string | null;
  supporter_type: "person" | "organization";
  support_type: "financial" | "material" | "service" | "publicity" | "other";
  counts_for_goal: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type SaveContributionInput = {
  id?: string;
  supporter_type: "person" | "organization";
  donor_name: string;
  public_name: boolean;
  public_display_name?: string;
  support_type: "financial" | "material" | "service" | "publicity" | "other";
  source?: string;
  amount_reais?: number;
  description?: string;
  counts_for_goal: boolean;
  occurred_at: string;
  status: string;
  notes?: string;
  institution?: string;
};

export async function fetchContributions(): Promise<{
  data: ContributionRow[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("dante_contributions")
    .select("*")
    .order("occurred_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as ContributionRow[]) || [] };
}

export async function saveContribution(
  input: SaveContributionInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Validate admin permissions via RLS
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Usuário não autenticado." };
  }

  const isFinancial = input.support_type === "financial";
  let amountCents: number | null = null;

  if (isFinancial) {
    if (typeof input.amount_reais !== "number" || input.amount_reais <= 0) {
      return {
        success: false,
        error: "Para apoio financeiro, informe um valor válido maior que zero.",
      };
    }
    amountCents = Math.round(input.amount_reais * 100);
  }

  const cleanDonorName = input.donor_name.trim();
  const cleanPublicDisplayName = input.public_name
    ? input.public_display_name?.trim() || cleanDonorName
    : null;

  const validSources = ["pix_direct", "cash", "clinic_direct", "manual", "mercado_pago"];
  const source = isFinancial
    ? (input.source && validSources.includes(input.source) ? input.source : "manual")
    : "manual";

  const payload = {
    supporter_type: input.supporter_type || "person",
    donor_name: cleanDonorName || null,
    public_name: Boolean(input.public_name),
    public_display_name: cleanPublicDisplayName,
    support_type: input.support_type || "financial",
    source,
    amount_cents: amountCents,
    counts_for_goal: Boolean(input.counts_for_goal),
    description: input.description?.trim() || null,
    occurred_at: input.occurred_at ? new Date(input.occurred_at).toISOString() : new Date().toISOString(),
    status: input.status || "approved",
    notes: input.notes?.trim() || null,
    institution: input.institution?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    // Updating existing record
    const { error: updateError } = await supabase
      .from("dante_contributions")
      .update(payload)
      .eq("id", input.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  } else {
    // Creating new record with unique dedupe_key
    const dedupeKey = `adm_manual:${crypto.randomUUID()}`;
    const insertPayload = {
      ...payload,
      dedupe_key: dedupeKey,
      provider: source === "pix_direct" ? "pix" : null,
    };

    const { error: insertError } = await supabase
      .from("dante_contributions")
      .insert(insertPayload);

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  revalidatePath("/adm", "layout");
  revalidatePath("/");
  return { success: true };
}

export async function deleteContribution(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Usuário não autenticado." };
  }

  // Check if contribution is from Mercado Pago to prevent accidental deletion
  const { data: record, error: fetchError } = await supabase
    .from("dante_contributions")
    .select("source, provider")
    .eq("id", id)
    .single();

  if (fetchError || !record) {
    return { success: false, error: "Registro não encontrado." };
  }

  if (record.source === "mercado_pago" || record.provider === "mercado_pago") {
    return {
      success: false,
      error:
        "Registros gerados automaticamente pelo Mercado Pago são protegidos e não podem ser excluídos pelo painel para preservar a integridade da conciliação. Altere o status se necessário.",
    };
  }

  const { error: deleteError } = await supabase
    .from("dante_contributions")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath("/adm", "layout");
  revalidatePath("/");
  return { success: true };
}
