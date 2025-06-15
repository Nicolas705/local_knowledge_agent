export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
}

export interface SystemStatus {
  documents: number;
  conversations: number;
  storage: {
    used: number;
    limit: number;
  };
  memory: {
    used: number;
    limit: number;
  };
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}
