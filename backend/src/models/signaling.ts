export type SignalingMessageType =
  | 'REGISTER'
  | 'UNREGISTER'
  | 'GET_DEVICES'
  | 'DEVICE_LIST'
  | 'DEVICE_JOINED'
  | 'DEVICE_LEFT'
  | 'SEND_OFFER'
  | 'OFFER_RECEIVED'
  | 'SEND_ANSWER'
  | 'ANSWER_RECEIVED'
  | 'SEND_ICE_CANDIDATE'
  | 'ICE_CANDIDATE_RECEIVED'
  | 'TRANSFER_REQUEST'
  | 'TRANSFER_ACCEPT'
  | 'TRANSFER_REJECT'
  | 'TRANSFER_PROGRESS'
  | 'TRANSFER_COMPLETE'
  | 'RELAY_DATA'
  | 'KEEP_ALIVE'
  | 'PONG'
  | 'ERROR';

export interface SignalingMessage<T = any> {
  type: SignalingMessageType;
  senderId?: string;
  targetId?: string;
  timestamp?: number;
  correlationId?: string;
  payload?: T;
  error?: string;
}

export interface TransferOfferPayload {
  transferId: string;
  fileName: string;
  fileSize: number;
  fileHash: string;
  chunkSize: number;
  totalChunks: number;
  mimeType?: string;
  encryptionPublicKey?: string;
  sdpOffer?: any;
}

export interface TransferAnswerPayload {
  transferId: string;
  accepted: boolean;
  reason?: string;
  encryptionPublicKey?: string;
  sdpAnswer?: any;
}

export interface IceCandidatePayload {
  transferId: string;
  candidate: any;
}

export interface RelayDataPayload {
  transferId: string;
  chunkIndex: number;
  totalChunks: number;
  data: string; // Base64 chunk or encrypted binary payload
  checksum: string;
}
