import { useEffect, useRef } from "react";
import { Bot, User, Brain } from "lucide-react";
import type { Message } from "@shared/schema";

interface ChatMessagesProps {
  messages: Message[];
  hasDocuments: boolean;
}

export default function ChatMessages({ messages, hasDocuments }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex justify-center">
          <div className="max-w-2xl text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="text-white h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Welcome to your Personal Knowledge Assistant
            </h3>
            <p className="text-slate-600">
              {hasDocuments 
                ? "Your documents are ready! Start asking questions to find relevant information with detailed answers and source citations."
                : "Upload your documents and start asking questions. I'll help you find relevant information and provide detailed answers with source citations."
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.map((message) => (
        <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {message.role === 'user' ? (
            <div className="max-w-2xl">
              <div className="bg-primary text-white rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-sm">{message.content}</p>
              </div>
              <p className="text-xs text-slate-500 mt-1 text-right">
                {formatTime(message.createdAt)}
              </p>
            </div>
          ) : (
            <div className="max-w-4xl">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="text-slate-600" size={16} />
                </div>
                <div className="flex-1">
                  <div className="bg-white rounded-2xl rounded-tl-md shadow-sm border border-slate-200 px-4 py-3">
                    <div className="prose prose-sm max-w-none">
                      {message.content.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-2 last:mb-0">{paragraph}</p>
                      ))}
                    </div>
                    
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs font-medium text-slate-700 mb-2">Sources:</p>
                        <div className="space-y-2">
                          {message.sources.map((source, index) => (
                            <div key={index} className="flex items-center space-x-2 text-xs">
                              <Bot className="text-primary" size={12} />
                              <span className="text-slate-600">{source}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
