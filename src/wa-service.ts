import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  downloadMediaMessage,
  useMultiFileAuthState,
} from "baileys";
import { parseMessage } from "./parse-message";
import { WhatsAppServiceClient } from "./generated/wa_grpc_pb";

export const startWaService = async (client: WhatsAppServiceClient) => {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  const sock = makeWASocket({
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
};
