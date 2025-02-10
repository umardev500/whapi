import { proto } from "baileys";

export interface MediaResponse {
  fileName: string;
  caption?: string | null;
  contextInfo?: proto.IContextInfo | null;
}

export type StreamResponse = {
  mt: string;
  jidList: string[];
};
