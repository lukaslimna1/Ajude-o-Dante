"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TimelineEventType = "update" | "medical" | "status" | "campaign" | "milestone";

export interface TimelineMediaRecord {
  id: string;
  event_id: string;
  media_type: "image" | "video";
  url: string;
  alt_text: string;
  caption: string | null;
  poster_url: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TimelineEventRecord {
  id: string;
  slug: string;
  event_date: string;
  display_date: string;
  display_time: string;
  location: string | null;
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
  media?: TimelineMediaRecord[];
}

export interface UpsertTimelineEventInput {
  id?: string;
  slug?: string;
  event_date: string;
  display_date?: string;
  display_time?: string;
  location?: string | null;
  title: string;
  summary?: string;
  description: string;
  status_label?: string | null;
  event_type?: TimelineEventType;
  is_current_status?: boolean;
  is_published?: boolean;
  sort_order?: number;
}

export interface UpsertMediaInput {
  id?: string;
  event_id: string;
  media_type: "image" | "video";
  url: string;
  alt_text?: string;
  caption?: string | null;
  poster_url?: string | null;
  is_primary?: boolean;
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

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");
  return { supabase, user };
}

// ─────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────
export async function getAdminTimelineEvents(): Promise<{
  success: boolean;
  events: TimelineEventRecord[];
  error?: string;
}> {
  try {
    const { supabase } = await assertAdmin();

    const { data, error } = await supabase
      .from("dante_timeline_events")
      .select("*, media:dante_timeline_media(*)")
      .order("sort_order", { ascending: false })
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return { success: false, events: [], error: error.message };

    return {
      success: true,
      events: (data || []) as TimelineEventRecord[],
    };
  } catch (err: unknown) {
    return {
      success: false,
      events: [],
      error: err instanceof Error ? err.message : "Erro ao carregar eventos.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// UPSERT EVENT
// ─────────────────────────────────────────────────────────────────
export async function upsertTimelineEventAction(
  input: UpsertTimelineEventInput
): Promise<{ success: boolean; error?: string; event?: TimelineEventRecord }> {
  try {
    const { supabase } = await assertAdmin();

    if (!input.title?.trim() || !input.event_date?.trim()) {
      return { success: false, error: "Título e Data da Atualização são obrigatórios." };
    }

    const baseSlug = input.slug?.trim() || slugify(input.title);
    const slug = input.id ? baseSlug : `${baseSlug}-${Date.now().toString().slice(-4)}`;

    // display_date: se vazio, será gerado pelo trigger do banco
    const displayDate = input.display_date?.trim() || "";

    const payload = {
      slug,
      event_date: input.event_date.trim(),
      display_date: displayDate,
      display_time: input.display_time?.trim() || "",
      location: input.location?.trim() || null,
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
        .select("*, media:dante_timeline_media(*)")
        .single();
      if (error) return { success: false, error: error.message };
      resData = data as TimelineEventRecord;
    } else {
      const { data, error } = await supabase
        .from("dante_timeline_events")
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select("*, media:dante_timeline_media(*)")
        .single();
      if (error) return { success: false, error: error.message };
      resData = data as TimelineEventRecord;
    }

    revalidatePath("/");
    revalidatePath("/adm/atualizacoes");
    return { success: true, event: resData || undefined };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao salvar atualização.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE EVENT
// ─────────────────────────────────────────────────────────────────
export async function deleteTimelineEventAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await assertAdmin();

    // Bloquear exclusão se for o estado atual
    const { data: ev } = await supabase
      .from("dante_timeline_events")
      .select("is_current_status, is_published")
      .eq("id", id)
      .single();

    if (ev?.is_current_status) {
      return {
        success: false,
        error:
          "Esta é a atualização atual do Dante. Defina outra atualização publicada como atual antes de excluí-la.",
      };
    }

    const { error } = await supabase.from("dante_timeline_events").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/adm/atualizacoes");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao excluir atualização.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// SET CURRENT STATUS
// ─────────────────────────────────────────────────────────────────
export async function setCurrentStatusAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await assertAdmin();

    // Evento deve estar publicado para ser estado atual
    const { data: ev } = await supabase
      .from("dante_timeline_events")
      .select("is_published")
      .eq("id", id)
      .single();

    if (!ev?.is_published) {
      return {
        success: false,
        error: "Apenas atualizações publicadas podem ser definidas como atual.",
      };
    }

    const { error } = await supabase
      .from("dante_timeline_events")
      .update({ is_current_status: true, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/adm/atualizacoes");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao definir estado atual.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// TOGGLE PUBLISH
// ─────────────────────────────────────────────────────────────────
export async function togglePublishTimelineEventAction(
  id: string,
  isPublished: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await assertAdmin();

    // Bloquear ocultação do estado atual
    if (!isPublished) {
      const { data: ev } = await supabase
        .from("dante_timeline_events")
        .select("is_current_status")
        .eq("id", id)
        .single();

      if (ev?.is_current_status) {
        return {
          success: false,
          error:
            "Esta é a atualização atual do Dante. Defina outra atualização publicada como atual antes de ocultá-la.",
        };
      }
    }

    const { error } = await supabase
      .from("dante_timeline_events")
      .update({ is_published: isPublished, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/adm/atualizacoes");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao alternar publicação.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// REORDER (move up / down)
// ─────────────────────────────────────────────────────────────────
export async function reorderTimelineEventAction(
  id: string,
  direction: "up" | "down"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await assertAdmin();

    const { data: current } = await supabase
      .from("dante_timeline_events")
      .select("sort_order")
      .eq("id", id)
      .single();

    if (!current) return { success: false, error: "Evento não encontrado." };

    const newOrder =
      direction === "up" ? current.sort_order + 1 : current.sort_order - 1;

    const { error } = await supabase
      .from("dante_timeline_events")
      .update({ sort_order: newOrder, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/adm/atualizacoes");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao reordenar.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// MEDIA CRUD
// ─────────────────────────────────────────────────────────────────
export async function upsertMediaAction(
  input: UpsertMediaInput
): Promise<{ success: boolean; error?: string; media?: TimelineMediaRecord }> {
  try {
    const { supabase } = await assertAdmin();

    if (!input.url?.trim()) return { success: false, error: "URL da mídia é obrigatória." };

    // Se is_primary, remover primary das outras fotos do evento (apenas imagens)
    if (input.is_primary && input.media_type === "image") {
      await supabase
        .from("dante_timeline_media")
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq("event_id", input.event_id)
        .eq("media_type", "image")
        .neq("id", input.id || "00000000-0000-0000-0000-000000000000");
    }

    const payload = {
      event_id: input.event_id,
      media_type: input.media_type,
      url: input.url.trim(),
      alt_text: input.alt_text?.trim() || "",
      caption: input.caption?.trim() || null,
      poster_url: input.poster_url?.trim() || null,
      is_primary: Boolean(input.is_primary),
      sort_order: Number(input.sort_order) || 0,
      updated_at: new Date().toISOString(),
    };

    let result: TimelineMediaRecord | null = null;

    if (input.id) {
      const { data, error } = await supabase
        .from("dante_timeline_media")
        .update(payload)
        .eq("id", input.id)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      result = data as TimelineMediaRecord;
    } else {
      const { data, error } = await supabase
        .from("dante_timeline_media")
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      result = data as TimelineMediaRecord;
    }

    revalidatePath("/");
    revalidatePath("/adm/atualizacoes");
    return { success: true, media: result || undefined };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao salvar mídia.",
    };
  }
}

export async function deleteMediaAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await assertAdmin();
    const { error } = await supabase.from("dante_timeline_media").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/");
    revalidatePath("/adm/atualizacoes");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao remover mídia.",
    };
  }
}
