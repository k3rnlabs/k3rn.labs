import { supabaseAdmin } from "./supabase-admin"
import type { RealtimeChannel } from "./realtime"

export async function broadcastToChannel(
  dossierId: string,
  channel: RealtimeChannel,
  payload: unknown
) {
  const channelName = `dossier:${dossierId}:${channel}`

  await supabaseAdmin.channel(channelName).send({
    type: "broadcast",
    event: "update",
    payload,
  })
}
