import * as dotenvx from "@dotenvx/dotenvx";
import * as grpc from "@grpc/grpc-js";
import { WhatsAppServiceClient } from "./generated/wa_grpc_pb";
import { startWaService, subscribe } from "./wa-service";
import { MessageType } from "./types/constants";

// Load .env file
dotenvx.config();

const PORT = process.env.WA_RPC_PORT;
const SERVER_ADDRESS = `localhost:${PORT}`;

const client = new WhatsAppServiceClient(
  SERVER_ADDRESS,
  grpc.credentials.createInsecure()
);

// Open a stream
const stream = client.streamMessage();

// Listen for incoming messages from the server
stream.on("data", (response) => {
  if (response.u && Array.isArray(response.u)) {
    const mt = response.u[0];

    for (const msg of response.u.slice(1)) {
      if (mt === MessageType.STATUS) {
        for (const jid of msg) {
          subscribe(jid);
        }
      }
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
