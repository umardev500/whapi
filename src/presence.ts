import { PresenceData } from "baileys";
import { SendOnlineUserRequest } from "./generated/wa_pb";
import { WhatsAppServiceClient } from "./generated/wa_grpc_pb";

export const parsePresence = (
  client: WhatsAppServiceClient,
  id: string,
  presenceData: PresenceData
) => {
  if ("lastSeen" in presenceData) {
    const onlineUser = new SendOnlineUserRequest();
    onlineUser.setJid(id);
    onlineUser.setPresence(presenceData.lastKnownPresence);
    onlineUser.setLastseen(presenceData.lastSeen ?? 0);
    client.sendOnlineUser(onlineUser, (err, response) => {
      if (err) {
        console.log("❌ Failed to send online user:", err);
      } else {
        console.log("✅ Online user sent:", response.toObject());
      }
    });
  }
};
