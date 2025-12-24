import { ParsedDocument } from "./ParsedDocument";

/**
 * Manages the lifecycle of parsed documents.
 */
export class DocumentManager {
	private documents = new Map<string, ParsedDocument>();

	/**
	 * Open a new document or replace an existing one.
	 */
	open(uri: string, content: string, version: number): ParsedDocument {
		const doc = new ParsedDocument(uri, content, version);
		this.documents.set(uri, doc);
		return doc;
	}

	/**
	 * Update an existing document. Creates a new ParsedDocument with updated content.
	 */
	update(uri: string, content: string, version: number): ParsedDocument {
		return this.open(uri, content, version);
	}

	/**
	 * Close a document and remove it from the manager.
	 */
	close(uri: string): void {
		this.documents.delete(uri);
	}

	/**
	 * Get a document by URI.
	 */
	get(uri: string): ParsedDocument | undefined {
		return this.documents.get(uri);
	}

	/**
	 * Check if a document is open.
	 */
	has(uri: string): boolean {
		return this.documents.has(uri);
	}

	/**
	 * Get all open document URIs.
	 */
	getUris(): string[] {
		return Array.from(this.documents.keys());
	}

	/**
	 * Close all documents.
	 */
	closeAll(): void {
		this.documents.clear();
	}
}
