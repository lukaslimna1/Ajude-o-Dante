"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TimelineEventType = "update" | "medical" | "status" | "campaign" | "milestone";

export interface TimelineEventRecord {
  id: string;
  slug: string;
  event_date: string;
  display_date: string;
  display_time: string;
  title: string;
  summary: string;
  description: string;
  status_label: string | null;
  event_type: TimelineEventType;
  is_current_status: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UpsertTimelineEventInput {
  id?: string;
  slug?: string;
  event_date: string;
  display_date: string;
  display_time?: string;
  title: string;
  summary?: string;
  description: string;
  status_label?: string | null;
  event_type: TimelineEventType;
  is_current_status?: boolean;
  is_published?: boolean;
  sort_order?: number;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

export async function getAdminTimelineEvents(): Promise<{
  success: boolean;
  events: TimelineEventRecord[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, events: [], error: "Usuário não autenticado." };
    }

    const { data, error } = await supabase
      .from("dante_timeline_events")
      .select("*")
      .order("event_date", { ascending: false })
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, events: [], error: error.message };
    }

    return {
      success: true,
      events: (data || []) as TimelineEventRecord[],
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao carregar eventos.";
    return { success: false, events: [], error: errorMsg };
  }
}

export async function upsertTimelineEventAction(
  input: UpsertTimelineEventInput
): Promise<{ success: boolean; error?: string; event?: TimelineEventRecord }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (!input.title?.trim() || !input.event_date?.trim() || !input.display_date?.trim()) {
      return {
        success: false,
        error: "Título, Data do Evento e Data de Exibição são obrigatórios.",
      };
    }

    const baseSlug = input.slug?.trim() || slugify(input.title);
    const slug = input.id ? baseSlug : `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const payload = {
      slug,
      event_date: input.event_date.trim(),
      display_date: input.display_date.trim(),
      display_time: input.display_time?.trim() || "",
      title: input.title.trim(),
      summary: input.summary?.trim() || "",
      description: input.description?.trim() || "",
      status_label: input.status_label?.trim() || null,
      event_type: input.event_type || "update",
      is_current_status: Boolean(input.is_current_status),
      is_published: input.is_published !== undefined ? Boolean(input.is_published) : true,
      sort_order: Number(input.sort_order) || 0,
      updated_at: new Date().toISOString(),
    };

    let resData: TimelineEventRecord | null = null;

    if (input.id) {
      const { data, error } = await supabase
        .from("dante_timeline_events")
        .update(payload)
        .eq("id", input.id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      resData = data as TimelineEventRecord;
    } else {
      const { data, error } = await supabase
        .from("dante_timeline_events")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      resData = data as TimelineEventRecord;
    }

    revalidatePath("/");
    revalidatePath("/adm/timeline-transparencia");

    return { success: true, event: resData || undefined };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao salvar evento.";
    return { success: false, error: errorMsg };
  }
}

export async function deleteTimelineEventAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Usuário não autenticado." };

    const { error } = await supabase.from("dante_timeline_events").delete().eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/adm/timeline-transparencia");
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao excluir evento.";
    return { success: false, error: errorMsg };
  }
}

export async function setCurrentStatusAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Usuário não autenticado." };

    const { error } = await supabase
      .from("dante_timeline_events")
      .update({
        is_current_status: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/adm/timeline-transparencia");
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao definir estado atual.";
    return { success: false, error: errorMsg };
  }
}

export async function togglePublishTimelineEventAction(
  id: string,
  isPublished: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Usuário não autenticado." };

    const { error } = await supabase
      .from("dante_timeline_events")
      .update({
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/adm/timeline-transparencia");
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao alternar publicação.";
    return { success: false, error: errorMsg };
  }
}
