import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { DocumentProcessor } from "./services/document-processor";
import { VectorSearch } from "./services/vector-search";
import { OpenAIService } from "./services/openai";
import { insertDocumentSchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";

const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

const vectorSearch = new VectorSearch();

// Initialize vector search with existing documents
async function initializeVectorSearch() {
  try {
    const documents = await storage.getDocuments();
    vectorSearch.updateDocuments(documents);
    console.log(`Vector search initialized with ${documents.length} documents`);
  } catch (error) {
    console.error('Failed to initialize vector search:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize vector search on startup
  await initializeVectorSearch();
  // Document endpoints
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/documents/upload", upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { originalname, mimetype, size, path: filePath } = req.file;

      // Validate file type
      const allowedTypes = [
        'text/plain',
        'text/markdown', 
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(mimetype)) {
        fs.unlinkSync(filePath); // Clean up uploaded file
        return res.status(400).json({ 
          message: "Unsupported file type. Please upload .txt, .md, .pdf, or .docx files." 
        });
      }

      // Process document
      const processed = await DocumentProcessor.processDocument(filePath, mimetype);

      // Create document record
      const documentData = insertDocumentSchema.parse({
        name: originalname.replace(/\.[^/.]+$/, ""), // Remove extension
        originalName: originalname,
        mimeType: mimetype,
        size,
        content: processed.content,
        chunks: processed.chunks,
      });

      const document = await storage.createDocument(documentData);

      // Update vector search index
      const allDocuments = await storage.getDocuments();
      vectorSearch.updateDocuments(allDocuments);

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.status(201).json(document);
    } catch (error) {
      // Clean up uploaded file on error
      if ((req as MulterRequest).file?.path) {
        try {
          fs.unlinkSync((req as MulterRequest).file!.path);
        } catch (cleanupError) {
          console.error('Failed to clean up file:', cleanupError);
        }
      }
      res.status(500).json({ message: (error as any).message });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDocument(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Update vector search index
      const allDocuments = await storage.getDocuments();
      vectorSearch.updateDocuments(allDocuments);

      res.json({ message: "Document deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Conversation endpoints
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const conversationData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteConversation(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      res.json({ message: "Conversation deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Message endpoints
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Create user message
      const userMessageData = insertMessageSchema.parse({
        conversationId,
        role: 'user',
        content,
        sources: [],
      });

      const userMessage = await storage.createMessage(userMessageData);

      // Get relevant context from documents
      const searchResults = await vectorSearch.search(content, 5);
      console.log(`Search query: "${content}"`);
      console.log(`Search results: ${searchResults.length} matches`);
      searchResults.forEach((result, index) => {
        console.log(`Result ${index + 1}: ${result.document.name} (similarity: ${result.similarity})`);
      });
      
      // Get conversation history for context
      const messages = await storage.getMessagesByConversation(conversationId);
      const conversationHistory = messages
        .slice(-6) // Last 6 messages
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      // Generate AI response
      const context = searchResults.map(result => ({
        chunk: result.chunk,
        source: result.document.name,
        chunkIndex: result.chunkIndex
      }));

      const aiResponse = await OpenAIService.generateResponse(
        content, 
        context,
        conversationHistory.slice(0, -1) // Exclude the just-added user message
      );

      // Create assistant message
      const assistantMessageData = insertMessageSchema.parse({
        conversationId,
        role: 'assistant',
        content: aiResponse.content,
        sources: aiResponse.sources,
      });

      const assistantMessage = await storage.createMessage(assistantMessageData);

      // Update conversation timestamp
      await storage.updateConversation(conversationId, {});

      res.json({
        userMessage,
        assistantMessage
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // System status endpoint
  app.get("/api/status", async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      const conversations = await storage.getConversations();
      
      const totalDocuments = documents.length;
      const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);
      const memoryUsage = process.memoryUsage();

      res.json({
        documents: totalDocuments,
        conversations: conversations.length,
        storage: {
          used: totalSize,
          limit: 500 * 1024 * 1024, // 500MB limit
        },
        memory: {
          used: memoryUsage.heapUsed,
          limit: 4 * 1024 * 1024 * 1024, // 4GB limit
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Initialize vector search with existing documents
  const existingDocuments = await storage.getDocuments();
  vectorSearch.updateDocuments(existingDocuments);

  const httpServer = createServer(app);
  return httpServer;
}
