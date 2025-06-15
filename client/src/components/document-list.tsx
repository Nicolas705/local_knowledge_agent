import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileText, Trash2, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Document } from "@shared/schema";

interface DocumentListProps {
  documents: Document[];
  onDocumentDeleted: () => void;
}

export default function DocumentList({ documents, onDocumentDeleted }: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/documents/${id}`);
    },
    onSuccess: () => {
      onDocumentDeleted();
      toast({
        title: "Document deleted",
        description: "Document has been removed from your library.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDeletingId(null);
    }
  });

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    await deleteMutation.mutateAsync(id);
  };

  const getFileIcon = (mimeType: string) => {
    switch (mimeType) {
      case 'application/pdf':
        return <FileImage className="text-red-600" size={16} />;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return <FileText className="text-blue-600" size={16} />;
      case 'text/markdown':
        return <FileText className="text-green-600" size={16} />;
      default:
        return <FileText className="text-primary" size={16} />;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return new Date(date).toLocaleDateString();
  };

  if (documents.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
        <p className="text-sm font-medium mb-1">No documents yet</p>
        <p className="text-xs">Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      {documents.map((document) => (
        <div
          key={document.id}
          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
        >
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
            {getFileIcon(document.mimeType)}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {document.name}
            </p>
            <p className="text-xs text-slate-500">
              {formatBytes(document.size)} • Added {formatDate(document.uploadedAt)}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-all"
            onClick={() => handleDelete(document.id)}
            disabled={deletingId === document.id}
          >
            {deletingId === document.id ? (
              <div className="h-3 w-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
