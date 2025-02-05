import * as dotenvx from "@dotenvx/dotenvx";
import * as grpc from "@grpc/grpc-js";
import { WhatsAppServiceClient } from "./generated/wa_grpc_pb";
import { startWaService } from "./wa-service";

// Load .env file
dotenvx.config();

const PORT = process.env.WA_RPC_PORT;
const SERVER_ADDRESS = `localhost:${PORT}`;

const client = new WhatsAppServiceClient(
  SERVER_ADDRESS,
  grpc.credentials.createInsecure()
);

startWaService(client);
