import { createSupabaseClient } from "./supabase"

export type RealtimeChannel = "canvas" | "score" | "lab" | "graph" | "mission"

export function subscribeToChannel(
  dossierId: string,
  channel: RealtimeChannel,
  onUpdate: (payload: unknown) => void
) {
  const supabase = createSupabaseClient()
  const channelName = `dossier:${dossierId}:${channel}`

  const sub = supabase
    .channel(channelName)
    .on("broadcast", { event: "update" }, (payload) => onUpdate(payload))
    .subscribe()

  return () => {
    supabase.removeChannel(sub)
  }
}
