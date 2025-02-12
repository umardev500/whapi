import { PresenceData } from "baileys";
import { SendOnlineUserRequest, SendTypingRequest } from "./generated/wa_pb";
import { WhatsAppServiceClient } from "./generated/wa_grpc_pb";

export const parsePresence = (
  client: WhatsAppServiceClient,
  id: string,
  presenceData: PresenceData
) => {
  console.log("presence:", presenceData);
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
  } else {
    parseTypingPresence(client, id, presenceData);
  }
};

export const parseTypingPresence = (
  client: WhatsAppServiceClient,
  id: string,
  presenceData: PresenceData
) => {
  const typing = new SendTypingRequest();
  typing.setJid(id);
  typing.setPresence(presenceData.lastKnownPresence);

  client.sendTyping(typing, (err, response) => {
    if (err) {
      console.log("❌ Failed to send typing:", err);
    } else {
      console.log("✅ Typing sent:", response.toObject());
    }
  });
};
