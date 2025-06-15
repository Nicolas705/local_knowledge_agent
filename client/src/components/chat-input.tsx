import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, Database, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Message } from "@shared/schema";

interface ChatInputProps {
  conversationId: number | null;
  onConversationCreated: (id: number) => void;
  onMessageSent: (userMessage: Message, assistantMessage: Message) => void;
  hasDocuments: boolean;
}

export default function ChatInput({ 
  conversationId, 
  onConversationCreated, 
  onMessageSent,
  hasDocuments 
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/conversations', {
        title: 'New Conversation'
      });
      return response.json();
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: number; content: string }) => {
      const response = await apiRequest('POST', `/api/conversations/${conversationId}/messages`, {
        content
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      onMessageSent(data.userMessage, data.assistantMessage);
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", variables.conversationId, "messages"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return;

    if (!hasDocuments) {
      toast({
        title: "No documents uploaded",
        description: "Please upload some documents before starting a conversation.",
        variant: "destructive",
      });
      return;
    }

    const content = message.trim();
    setMessage("");
    setIsLoading(true);

    try {
      let currentConversationId = conversationId;

      // Create conversation if none exists
      if (!currentConversationId) {
        const conversation = await createConversationMutation.mutateAsync();
        currentConversationId = conversation.id;
        onConversationCreated(conversation.id);
      }

      // Send message
      await sendMessageMutation.mutateAsync({
        conversationId: currentConversationId!,
        content
      });

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const clearConversation = () => {
    // This would trigger a conversation clear/delete
    // For now, just clear the input
    setMessage("");
  };

  return (
    <div className="border-t border-slate-200 bg-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasDocuments ? "Ask a question about your documents..." : "Upload documents first..."}
                className="min-h-[44px] max-h-32 pr-12 resize-none"
                disabled={!hasDocuments || isLoading}
              />
              
              <Button
                onClick={handleSubmit}
                disabled={!message.trim() || !hasDocuments || isLoading}
                size="sm"
                className="absolute bottom-2 right-2 p-2 h-8 w-8"
              >
                {isLoading ? (
                  <div className="h-3 w-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </Button>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-4 text-xs text-slate-500">
                {hasDocuments ? (
                  <>
                    <span className="flex items-center">
                      <Database className="mr-1" size={10} />
                      Documents indexed
                    </span>
                    <span className="flex items-center">
                      <Clock className="mr-1" size={10} />
                      Ready to respond
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400">Upload documents to start chatting</span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearConversation}
                  className="p-1 text-slate-400 hover:text-slate-600 h-6 w-6"
                  title="Clear conversation"
                >
                  <Trash2 size={10} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
