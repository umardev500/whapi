import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from "baileys";
import { WhatsAppServiceClient } from "./generated/wa_grpc_pb";
import { SendOnlineUserRequest } from "./generated/wa_pb";
import { parseMessage } from "./parse-message";
import { parsePresence } from "./presence";

let sock: WASocket | null = null;
let subscribedList: string[] = [];

export const subscribe = async (jid: string, reconnect = false) => {
  if (!sock) {
    console.log("no sock");
    return;
  }

  const msg = reconnect
    ? `✅ re-subscribing to ${jid}`
    : `📩 subscribing to ${jid}`;

  console.log(msg);
  if (!subscribedList.includes(jid)) {
    await sock.presenceSubscribe(jid);
    subscribedList.push(jid);
  }
};

export const startWaService = async (
  client: WhatsAppServiceClient,
  reconnect = false
) => {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    connectTimeoutMs: 10000,
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
        startWaService(client, true);
      }
    } else if (connection === "open") {
      console.log("opened connection");

      // After reconnecting we need to re-subscribe presence channel
      if (reconnect) {
        subscribedList.forEach((jid) => {
          subscribe(jid, reconnect);
        });
      }
    }
  });

  sock.ev.on("messages.upsert", (upsert) => {
    const msg = upsert.messages[0];
    console.log(msg.message?.extendedTextMessage?.contextInfo);
    parseMessage(client, msg);
  });

  sock.ev.on("presence.update", (presence) => {
    const { id, presences } = presence;
    const [_, presenceData] = Object.entries(presences)[0] || [];

    parsePresence(client, id, presenceData);
  });
};
