import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatMessages from "./chat-messages";
import ChatInput from "./chat-input";
import type { Message } from "@shared/schema";

interface ChatInterfaceProps {
  conversationId: number | null;
  onConversationCreated: (id: number) => void;
  hasDocuments: boolean;
}

export default function ChatInterface({ 
  conversationId, 
  onConversationCreated, 
  hasDocuments 
}: ChatInterfaceProps) {
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/conversations", conversationId, "messages"],
    enabled: !!conversationId,
  });

  const handleMessageSent = (userMessage: Message, assistantMessage: Message) => {
    // The query will automatically refetch and update the UI
  };

  return (
    <div className="flex-1 flex flex-col">
      <ChatMessages 
        messages={messages}
        hasDocuments={hasDocuments}
      />
      
      <ChatInput
        conversationId={conversationId}
        onConversationCreated={onConversationCreated}
        onMessageSent={handleMessageSent}
        hasDocuments={hasDocuments}
      />
    </div>
  );
}
