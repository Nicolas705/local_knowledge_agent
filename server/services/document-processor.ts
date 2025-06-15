import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';

export interface ProcessedDocument {
  content: string;
  chunks: string[];
}

export class DocumentProcessor {
  private static readonly CHUNK_SIZE = 1000;
  private static readonly CHUNK_OVERLAP = 200;

  static async processDocument(filePath: string, mimeType: string): Promise<ProcessedDocument> {
    try {
      let content = '';

      switch (mimeType) {
        case 'text/plain':
        case 'text/markdown':
          content = await this.processTextFile(filePath);
          break;
        case 'application/pdf':
          content = await this.processPdfFile(filePath);
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          content = await this.processDocxFile(filePath);
          break;
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }

      const chunks = this.chunkText(content);
      return { content, chunks };
    } catch (error: any) {
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  private static async processTextFile(filePath: string): Promise<string> {
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to read text file: ${error.message}`);
    }
  }

  private static async processPdfFile(filePath: string): Promise<string> {
    // PDF processing temporarily disabled - focus on text/markdown first
    throw new Error('PDF processing not yet supported. Please use .txt or .md files.');
  }

  private static async processDocxFile(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error: any) {
      throw new Error(`Failed to parse DOCX: ${error.message}`);
    }
  }

  private static chunkText(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;
      
      const proposedChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence;
      
      if (proposedChunk.length <= this.CHUNK_SIZE) {
        currentChunk = proposedChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        currentChunk = trimmedSentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }
    
    return chunks;
  }
}
