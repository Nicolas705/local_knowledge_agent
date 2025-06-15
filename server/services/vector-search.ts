import { Document } from "@shared/schema";

export interface SearchResult {
  document: Document;
  chunk: string;
  similarity: number;
  chunkIndex: number;
}

export class VectorSearch {
  private documents: Document[] = [];

  updateDocuments(documents: Document[]) {
    this.documents = documents;
    console.log(`Vector search updated with ${documents.length} documents`);
    documents.forEach(doc => {
      console.log(`Document: ${doc.name}, chunks: ${doc.chunks.length}`);
    });
  }

  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    if (!this.documents.length) {
      return [];
    }

    const results: SearchResult[] = [];

    for (const document of this.documents) {
      for (let i = 0; i < document.chunks.length; i++) {
        const chunk = document.chunks[i];
        const similarity = this.calculateSimilarity(query.toLowerCase(), chunk.toLowerCase());
        console.log(`Chunk: "${chunk.substring(0, 100)}..." - Similarity: ${similarity}`);
        
        if (similarity > 0.01) { // Lower similarity threshold for better matching
          results.push({
            document,
            chunk,
            similarity,
            chunkIndex: i
          });
        }
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private calculateSimilarity(query: string, text: string): number {
    const queryWords = this.tokenize(query);
    const textWords = this.tokenize(text);
    
    if (queryWords.length === 0 || textWords.length === 0) {
      return 0;
    }

    // Simple keyword matching with TF-IDF-like scoring
    let score = 0;
    const textWordCount = new Map<string, number>();
    
    // Count word frequencies in text
    for (const word of textWords) {
      textWordCount.set(word, (textWordCount.get(word) || 0) + 1);
    }

    // Calculate score based on query words found in text
    for (const queryWord of queryWords) {
      const count = textWordCount.get(queryWord) || 0;
      if (count > 0) {
        // TF-IDF like scoring: higher score for rarer words
        const tf = count / textWords.length;
        const idf = Math.log(1 + 1 / Math.max(1, count));
        score += tf * idf;
      }
    }

    // Normalize by query length
    return score / queryWords.length;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1) // Keep words longer than 1 character
      .filter(word => !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);
    return stopWords.has(word);
  }
}
