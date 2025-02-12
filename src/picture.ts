import { WhatsAppServiceClient } from "./generated/wa_grpc_pb";
import { SubscribeProfilePicRequest } from "./generated/wa_pb";
import { getProfilePicUrl } from "./wa-service";

export const listenPicStream = (client: WhatsAppServiceClient) => {
  const stream = client.subscribeProfilePic();

  stream.on("data", async (response) => {
    const pic = response.toObject();
    console.log("📷 Received profile pic:", pic);
    try {
      const url = await getProfilePicUrl(pic.jid);
      const msg = new SubscribeProfilePicRequest();
      msg.setUrl(url ?? "");
      stream.write(msg);
    } catch (err) {
      console.log("❌ Failed to get profile pic url:", pic.jid, err);
      console.log("Will send empty message");
      const msg = new SubscribeProfilePicRequest();
      msg.setUrl("");
      stream.write(msg);
    }
  });

  stream.on("end", () => {
    console.log("📷 Stream ended");
  });

  stream.on("error", (error) => {
    console.error("📷 Stream error:", error);
  });
};
