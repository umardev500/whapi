import * as dotenvx from "@dotenvx/dotenvx";
import * as grpc from "@grpc/grpc-js";
import { WhatsAppServiceClient } from "./generated/wa_grpc_pb";
import { startWaService, subscribe } from "./wa-service";
import { MessageType } from "./types/constants";
import { StreamResponse } from "./types/message-types";

// Load .env file
dotenvx.config();

const PORT = process.env.WA_RPC_PORT;
const SERVER_ADDRESS = `localhost:${PORT}`;

const client = new WhatsAppServiceClient(
  SERVER_ADDRESS,
  grpc.credentials.createInsecure()
);

// Open a stream
const stream = client.subscribePresense();

// Listen for incoming messages from the server
stream.on("data", (response) => {
  const streamResp = response.toObject() as StreamResponse;
  console.log(streamResp);
  const mt = streamResp.mt;

  for (const jid of streamResp.jidList) {
    if (mt === MessageType.STATUS) {
      subscribe(jid);
    }
  }
});

// Handle stream errors
stream.on("error", (err) => {
  console.error("❌ Stream error:", err);
});

// Handle stream end
stream.on("end", () => {
  console.log("🔚 Server closed the connection.");
});

startWaService(client);
