import { documents, conversations, messages, type Document, type InsertDocument, type Conversation, type InsertConversation, type Message, type InsertMessage } from "@shared/schema";

export interface IStorage {
  // Documents
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Conversations
  getConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<boolean>;
  
  // Messages
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessagesByConversation(conversationId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private documents: Map<number, Document>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private currentDocumentId: number;
  private currentConversationId: number;
  private currentMessageId: number;

  constructor() {
    this.documents = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.currentDocumentId = 1;
    this.currentConversationId = 1;
    this.currentMessageId = 1;
  }

  // Documents
  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const document: Document = {
      ...insertDocument,
      id,
      chunks: insertDocument.chunks || [],
      uploadedAt: new Date(),
    };
    this.documents.set(id, document);
    return document;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.currentConversationId++;
    const now = new Date();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const existing = this.conversations.get(id);
    if (!existing) return undefined;

    const updated: Conversation = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    this.conversations.set(id, updated);
    return updated;
  }

  async deleteConversation(id: number): Promise<boolean> {
    const deleted = this.conversations.delete(id);
    if (deleted) {
      // Also delete associated messages
      await this.deleteMessagesByConversation(id);
    }
    return deleted;
  }

  // Messages
  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = {
      ...insertMessage,
      id,
      sources: insertMessage.sources || null,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async deleteMessagesByConversation(conversationId: number): Promise<boolean> {
    const messagesToDelete = Array.from(this.messages.entries())
      .filter(([_, message]) => message.conversationId === conversationId);
    
    messagesToDelete.forEach(([id]) => this.messages.delete(id));
    return messagesToDelete.length > 0;
  }
}

export const storage = new MemStorage();
