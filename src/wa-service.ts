import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from "baileys";
import { WhatsAppServiceClient } from "./generated/wa_grpc_pb";
import { SendOnlineUserRequest } from "./generated/wa_pb";
import { parseMessage } from "./parse-message";

let sock: WASocket | null = null;
let subscribedList: string[] = [];

export const subscribe = async (jid: string) => {
  if (!sock) {
    console.log("no sock");
    return;
  }

  console.log("subscribing to", jid);
  if (!subscribedList.includes(jid)) {
    await sock.presenceSubscribe(jid);
    subscribedList.push(jid);
  }
};

export const startWaService = async (client: WhatsAppServiceClient) => {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log("Connection closed, reconnecting:", shouldReconect);
      // reconnect if not logged out
      if (shouldReconect) {
        startWaService(client);
      }
    } else if (connection === "open") {
      console.log("opened connection");
    }
  });

  sock.ev.on("messages.upsert", (upsert) => {
    const msg = upsert.messages[0];
    parseMessage(client, msg);
  });

  sock.ev.on("presence.update", (presence) => {
    const { id, presences } = presence;
    const [_, presenceData] = Object.entries(presences)[0] || [];
    console.log(id, presenceData);

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
  });
};
