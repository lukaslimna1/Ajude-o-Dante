"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface RaffleAdminMetrics {
  raffleStatus: "draft" | "active" | "finished" | "cancelled";
  confirmedCents: number;
  paidNumbersCount: number;
  awaitingCount: number;
  reservedCount: number;
  availableCount: number;
  totalNumbers: number;
  maxRevenueCents: number;
}

export interface AdminReservationItem {
  id: string;
  order_code: string;
  customer_name: string;
  customer_whatsapp: string;
  status: "reserved" | "awaiting_confirmation" | "paid" | "expired" | "cancelled";
  total_cents: number;
  quantity: number;
  numbers: number[];
  created_at: string;
  expires_at: string | null;
  proof_sent_at: string | null;
  confirmed_at: string | null;
  admin_notes: string | null;
  entry_source: "site" | "admin_manual";
  payment_method?: "pix" | "cash" | "transfer" | "other" | null;
}

export interface AdminNumberGridItem {
  number: number;
  status: "available" | "reserved" | "awaiting_confirmation" | "paid";
  customer_name?: string | null;
  order_code?: string | null;
}

export async function fetchRaffleAdminData(): Promise<{
  success: boolean;
  metrics: RaffleAdminMetrics;
  reservations: AdminReservationItem[];
  numbers: AdminNumberGridItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const { data: isAdmin } = await supabase.rpc("is_dante_admin");
    if (!isAdmin) {
      return {
        success: false,
        metrics: {
          raffleStatus: "draft",
          confirmedCents: 0,
          paidNumbersCount: 0,
          awaitingCount: 0,
          reservedCount: 0,
          availableCount: 100,
          totalNumbers: 100,
          maxRevenueCents: 150000,
        },
        reservations: [],
        numbers: [],
        error: "Acesso não autorizado.",
      };
    }

    // 0. Fetch raffle status
    const { data: raffleRecord } = await supabase
      .from("dante_raffle")
      .select("status")
      .eq("id", "main")
      .single();

    // 1. Fetch numbers to calculate visual counts accurately
    const { data: numbersData, error: numbersError } = await supabase
      .from("dante_raffle_numbers")
      .select("number, status, reserved_until, reservation_id, confirmed_at")
      .order("number", { ascending: true });

    if (numbersError) {
      throw new Error(numbersError.message);
    }

    const now = new Date().toISOString();
    let paidCount = 0;
    let awaitingCount = 0;
    let reservedCount = 0;
    let availableCount = 0;

    const reservationNumbersMap = new Map<string, number[]>();
    const gridNumbers: AdminNumberGridItem[] = [];

    for (const num of numbersData || []) {
      if (num.reservation_id) {
        const list = reservationNumbersMap.get(num.reservation_id) || [];
        list.push(num.number);
        reservationNumbersMap.set(num.reservation_id, list);
      }

      let visualStatus: "available" | "reserved" | "awaiting_confirmation" | "paid" = "available";

      if (num.status === "paid") {
        paidCount++;
        visualStatus = "paid";
      } else if (num.status === "awaiting_confirmation") {
        awaitingCount++;
        visualStatus = "awaiting_confirmation";
      } else if (num.status === "reserved" && (!num.reserved_until || num.reserved_until > now)) {
        reservedCount++;
        visualStatus = "reserved";
      } else {
        availableCount++;
        visualStatus = "available";
      }

      gridNumbers.push({
        number: num.number,
        status: visualStatus,
      });
    }

    // 2. Fetch reservations
    const { data: resData, error: resError } = await supabase
      .from("dante_raffle_reservations")
      .select("*")
      .order("created_at", { ascending: false });

    if (resError) {
      throw new Error(resError.message);
    }

    let confirmedCents = 0;
    const reservations: AdminReservationItem[] = (resData || []).map((r) => {
      if (r.status === "paid") {
        confirmedCents += Number(r.total_cents);
      }
      return {
        id: r.id,
        order_code: r.order_code,
        customer_name: r.customer_name,
        customer_whatsapp: r.customer_whatsapp,
        status: r.status,
        total_cents: Number(r.total_cents),
        quantity: Number(r.quantity),
        numbers: (reservationNumbersMap.get(r.id) || []).sort((a, b) => a - b),
        created_at: r.created_at,
        expires_at: r.expires_at,
        proof_sent_at: r.proof_sent_at,
        confirmed_at: r.confirmed_at,
        admin_notes: r.admin_notes,
        entry_source: (r.entry_source as "site" | "admin_manual") || "site",
        payment_method: r.payment_method || null,
      };
    });

    return {
      success: true,
      metrics: {
        raffleStatus:
          (raffleRecord?.status as "draft" | "active" | "finished" | "cancelled") ||
          "draft",
        confirmedCents,
        paidNumbersCount: paidCount,
        awaitingCount,
        reservedCount,
        availableCount,
        totalNumbers: 100,
        maxRevenueCents: 150000,
      },
      reservations,
      numbers: gridNumbers,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao carregar dados da Rifa.";
    return {
      success: false,
      metrics: {
        raffleStatus: "draft",
        confirmedCents: 0,
        paidNumbersCount: 0,
        awaitingCount: 0,
        reservedCount: 0,
        availableCount: 100,
        totalNumbers: 100,
        maxRevenueCents: 150000,
      },
      reservations: [],
      numbers: [],
      error: errorMsg,
    };
  }
}

export async function updateRaffleStatus(
  status: "draft" | "active" | "finished" | "cancelled"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_dante_raffle_status", {
      p_raffle_id: "main",
      p_status: status,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/adm/acao-entre-amigos");
    revalidatePath("/acao-entre-amigos");
    return { success: Boolean(data?.success), error: data?.error };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao atualizar status da ação.";
    return { success: false, error: errorMsg };
  }
}

export async function confirmRafflePayment(
  reservationId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("confirm_dante_raffle_payment", {
      p_reservation_id: reservationId,
      p_notes: notes || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/adm/acao-entre-amigos");
    revalidatePath("/acao-entre-amigos");
    return { success: Boolean(data?.success), error: data?.error };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao confirmar pagamento.";
    return { success: false, error: errorMsg };
  }
}

export async function releaseRaffleReservation(
  reservationId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("release_dante_raffle_reservation", {
      p_reservation_id: reservationId,
      p_notes: notes || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/adm/acao-entre-amigos");
    revalidatePath("/acao-entre-amigos");
    return { success: Boolean(data?.success), error: data?.error };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao liberar números da reserva.";
    return { success: false, error: errorMsg };
  }
}

export async function adminCreateManualRaffleEntry(params: {
  numbers: number[];
  customerName: string;
  customerWhatsapp?: string;
  paymentStatus: "paid" | "reserved";
  paymentMethod?: "pix" | "cash" | "transfer" | "other";
  reservationMode?: "30_minutes" | "without_expiration";
  notes?: string;
}): Promise<{ success: boolean; order_code?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_create_dante_raffle_entry", {
      p_raffle_id: "main",
      p_numbers: params.numbers,
      p_customer_name: params.customerName,
      p_customer_whatsapp: params.customerWhatsapp || "",
      p_payment_status: params.paymentStatus,
      p_payment_method: params.paymentMethod || null,
      p_reservation_mode: params.reservationMode || "without_expiration",
      p_notes: params.notes || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/adm/acao-entre-amigos");
    revalidatePath("/acao-entre-amigos");
    return { success: Boolean(data?.success), order_code: data?.order_code, error: data?.error };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao cadastrar lançamento manual.";
    return { success: false, error: errorMsg };
  }
}
