import { proto } from "baileys";

export interface MediaResponse {
  fileName: string;
  caption?: string | null;
  contextInfo?: proto.IContextInfo | null;
}
