import { proto } from "baileys";

export interface MediaResponse {
  filePath: string;
  fileName: string;
  caption?: string | null;
  contextInfo?: proto.IContextInfo | null;
}
