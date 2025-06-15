import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DocumentUpload from "@/components/document-upload";
import DocumentList from "@/components/document-list";
import ChatInterface from "@/components/chat-interface";
import StatusBar from "@/components/status-bar";
import { Brain, Settings, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Document, Conversation } from "@shared/schema";
import type { SystemStatus } from "@/lib/types";

export default function Home() {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);

  const { data: documents = [], refetch: refetchDocuments } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: conversations = [], refetch: refetchConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: status } = useQuery<SystemStatus>({
    queryKey: ["/api/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Create default conversation if none exists
  useEffect(() => {
    if (conversations.length === 0) {
      // Will be handled by the chat interface
      return;
    }
    
    if (!currentConversationId && conversations.length > 0) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Brain className="text-white text-sm" size={16} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Personal Knowledge Assistant</h1>
              <p className="text-sm text-slate-500">Offline AI for Private Documents</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
              <span className="text-slate-600">Offline Mode</span>
            </div>
            <Button
              variant="ghost" 
              size="sm"
              className="p-2 text-slate-400 hover:text-slate-600"
            >
              <Settings size={16} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Document Library */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Document Library</h2>
            <DocumentUpload onUploadComplete={refetchDocuments} />
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <DocumentList 
              documents={documents} 
              onDocumentDeleted={refetchDocuments}
            />
          </div>
        </aside>

        {/* Main Chat Interface */}
        <main className="flex-1 flex flex-col">
          <ChatInterface 
            conversationId={currentConversationId}
            onConversationCreated={(id) => {
              setCurrentConversationId(id);
              refetchConversations();
            }}
            hasDocuments={documents.length > 0}
          />
        </main>
      </div>

      {/* Status Bar */}
      <StatusBar 
        documentsCount={documents.length}
        memoryUsage={status?.memory ? `${formatBytes(status.memory.used)} / ${formatBytes(status.memory.limit)}` : "N/A"}
        storageUsage={status?.storage ? `${formatBytes(status.storage.used)} / ${formatBytes(status.storage.limit)}` : "N/A"}
      />
    </div>
  );
}
