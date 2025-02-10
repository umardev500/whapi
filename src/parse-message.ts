import { downloadMediaMessage, proto } from "baileys";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { WhatsAppServiceClient } from "./generated/wa_grpc_pb";
import {
  ContextInfo,
  ExtendedTextMessageRequest,
  FileMetadataRequest,
  ImageMessage,
  MediaUploadRequest,
  MessageMetadata,
  QuotedMessage,
  TextMessageRequest,
} from "./generated/wa_pb";
import { MediaResponse } from "./types/message-types";

export const parseMessage = async (
  client: WhatsAppServiceClient,
  msg: proto.IWebMessageInfo
) => {
  if (msg.key.fromMe || !msg.message) return;

  const message = msg.message;
  const metadata = new MessageMetadata();
  metadata.setRemotejid(msg.key.remoteJid!);
  metadata.setFromme(msg.key.fromMe!);
  metadata.setId(msg.key.id!);

  if (message.imageMessage) {
    await handleMediaMessage(client, msg, message, metadata);
  } else if (message.conversation) {
    handleTextMessage(
      client,
      message.conversation,
      metadata,
      msg.pushName!,
      msg.messageTimestamp!
    );
  } else if (message.extendedTextMessage) {
    handleExtendedTextMessage(client, message.extendedTextMessage, metadata);
  }
};

// Handle media messages (images, videos, audio, documents, stickers)
const handleMediaMessage = async (
  client: WhatsAppServiceClient,
  msg: proto.IWebMessageInfo,
  message: proto.IMessage,
  meta: MessageMetadata
) => {
  try {
    const media = await processMedia(client, msg, message);
    if (!media) return;

    console.log("✅ File Uploaded:", media);
    const metadata = createFileMetadata(media, meta, message);

    client.storeFileMetadata(metadata, (err, response) => {
      if (err) {
        console.error("❌ Failed to store file metadata:", err);
      } else {
        console.log("✅ File Metadata Stored:", response.toObject());
      }
    });
  } catch (err) {
    console.error("❌ Failed to download media:", err);
  }
};

// Handle text messages
const handleTextMessage = (
  client: WhatsAppServiceClient,
  text: string,
  metadata: MessageMetadata,
  pushName: string,
  timestamp: number | Long
) => {
  const msgRequest = new TextMessageRequest();
  msgRequest.setConversation(text);
  msgRequest.setMetadata(metadata);
  msgRequest.setPushname(pushName);
  msgRequest.setTimestamp(Number(timestamp));

  client.sendTextMessage(msgRequest, (err, response) => {
    if (err) {
      console.error("❌ Failed to send message:", err);
    } else {
      console.log("✅ Message Sent:", response);
    }
  });

  console.log("📩 Received message:", text);
};

// Handle extended text messages with quoted messages
const handleExtendedTextMessage = (
  client: WhatsAppServiceClient,
  extendedMessage: proto.Message.IExtendedTextMessage,
  metadata: MessageMetadata
) => {
  const { text, contextInfo } = extendedMessage;
  if (!text || !contextInfo) return;

  const extendedMsgRequest = new ExtendedTextMessageRequest();
  extendedMsgRequest.setMetadata(metadata);
  extendedMsgRequest.setText(text);

  const ctxInfoInstance = new ContextInfo();
  ctxInfoInstance.setStanzaid(contextInfo.stanzaId!);
  ctxInfoInstance.setParticipant(contextInfo.participant!);

  const quotedMessageInstance = createQuotedMessage(contextInfo.quotedMessage);
  ctxInfoInstance.setQuotedmessage(quotedMessageInstance);
  extendedMsgRequest.setContextinfo(ctxInfoInstance);

  client.sendExtendedTextMessage(extendedMsgRequest, (err, response) => {
    if (err) {
      console.error("❌ Failed to send extended text message:", err);
    } else {
      console.log("✅ Extended Message Sent:", response);
    }
  });

  console.log("📩 Received extended message:", text);
};

// Create file metadata request
const createFileMetadata = (
  media: MediaResponse,
  meta: MessageMetadata,
  message: proto.IMessage
): FileMetadataRequest => {
  const mediaMsg = message.imageMessage;
  const ctxInfoInstance = new ContextInfo();
  ctxInfoInstance.setStanzaid(mediaMsg?.contextInfo?.stanzaId!);
  ctxInfoInstance.setParticipant(mediaMsg?.contextInfo?.participant!);
  const quotedMessageInstance = createQuotedMessage(
    mediaMsg?.contextInfo?.quotedMessage
  );
  ctxInfoInstance.setQuotedmessage(quotedMessageInstance);

  const metadata = new FileMetadataRequest();
  metadata.setMetadata(meta);
  metadata.setCaption(new StringValue().setValue(mediaMsg?.caption ?? ""));
  metadata.setFilename(media.fileName);
  metadata.setContextinfo(ctxInfoInstance);
  return metadata;
};

// Create quoted message (handles text and images)
const createQuotedMessage = (
  quotedMessage?: proto.IMessage | null
): QuotedMessage => {
  const quotedMessageInstance = new QuotedMessage();

  if (!quotedMessage) return quotedMessageInstance;

  if (quotedMessage.conversation) {
    quotedMessageInstance.setConversation(
      new StringValue().setValue(quotedMessage.conversation)
    );
  } else if (quotedMessage.imageMessage) {
    const imgMessageInstance = new ImageMessage();
    imgMessageInstance.setMimetype(quotedMessage.imageMessage.mimetype!);
    imgMessageInstance.setCaption(
      new StringValue().setValue(quotedMessage.imageMessage.caption!)
    );
    quotedMessageInstance.setImagemessage(imgMessageInstance);
  }

  return quotedMessageInstance;
};

// Process media message (downloads and uploads media)
const processMedia = async (
  client: WhatsAppServiceClient,
  msg: proto.IWebMessageInfo,
  message?: proto.IMessage
): Promise<MediaResponse | null> => {
  const mediaMsg =
    message?.imageMessage ||
    message?.videoMessage ||
    message?.audioMessage ||
    message?.documentMessage ||
    message?.stickerMessage;

  if (!mediaMsg) return null;

  const caption = "caption" in mediaMsg ? mediaMsg.caption : null;

  try {
    const stream = await downloadMediaMessage(msg, "stream", {});

    return new Promise((resolve, reject) => {
      const call = client.uploadMedia((err, resp) => {
        if (err) {
          console.error("❌ Failed to upload media:", err);
          return reject(err);
        }

        resolve({
          fileName: resp.toObject().filepath,
          caption,
          contextInfo: mediaMsg.contextInfo,
        });
      });

      stream.on("data", (chunk: Buffer) => {
        const chunkData = new MediaUploadRequest();
        chunkData.setChunk(chunk);
        call.write(chunkData);
      });

      stream.on("end", () => call.end());
      stream.on("error", reject);
    });
  } catch (err) {
    console.error("❌ Media processing error:", err);
    return null;
  }
};
