import PyPDF2
import docx2txt
import magic
from typing import List, Dict
import tiktoken
from io import BytesIO


class DocumentProcessor:
    def __init__(self):
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        self.chunk_size = 500
        self.chunk_overlap = 50

    def extract_text(self, file_content: bytes, mime_type: str) -> str:
        """Extract text from different file types."""
        if "pdf" in mime_type.lower():
            return self._extract_from_pdf(file_content)
        elif "word" in mime_type.lower() or "docx" in mime_type.lower():
            return self._extract_from_docx(file_content)
        elif "text" in mime_type.lower():
            return file_content.decode("utf-8")
        else:
            raise ValueError(f"Unsupported file type: {mime_type}")

    def _extract_from_pdf(self, content: bytes) -> str:
        print("Starting PDF text extraction")
        try:
            pdf_file = BytesIO(content)
            print("Created BytesIO object")

            reader = PyPDF2.PdfReader(pdf_file)
            print(f"Created PDF reader, found {len(reader.pages)} pages")

            text = ""
            for i, page in enumerate(reader.pages):
                try:
                    page_text = page.extract_text()
                    print(f"Extracted {len(page_text)} characters from page {i + 1}")
                    text += page_text + "\n"
                except Exception as e:
                    print(f"Error extracting text from page {i + 1}: {str(e)}")

            if not text.strip():
                print("Warning: No text extracted from PDF")
            else:
                print(f"Successfully extracted {len(text)} total characters")

            return text
        except Exception as e:
            print(f"Error in PDF extraction: {str(e)}")
            raise

    def _extract_from_docx(self, content: bytes) -> str:
        docx_file = BytesIO(content)
        text = docx2txt.process(docx_file)
        return text

    def create_chunks(self, text: str) -> List[str]:
        """Split text into chunks with overlap."""
        tokens = self.tokenizer.encode(text)
        chunks = []

        i = 0
        while i < len(tokens):
            # Get chunk_size tokens
            chunk_tokens = tokens[i : i + self.chunk_size]

            # Decode chunk tokens back to text
            chunk_text = self.tokenizer.decode(chunk_tokens)
            chunks.append(chunk_text)

            # Move forward by chunk_size - overlap
            i += self.chunk_size - self.chunk_overlap

        return chunks

    def get_mime_type(self, content: bytes, filename: str = "") -> str:
        """Detect MIME type of file content."""
        try:
            mime = magic.Magic(mime=True)
            mime_type = mime.from_buffer(content)
            print(f"Detected MIME type: {mime_type} for file: {filename}")

            # Add more detailed logging for PDF files
            if filename.lower().endswith(".pdf"):
                print(f"File has .pdf extension")
                if "pdf" not in mime_type.lower():
                    print(
                        f"Warning: File has .pdf extension but mime-type is {mime_type}"
                    )
                    print(f"First 20 bytes of content: {content[:20]}")
                    # Force PDF mime type for files with .pdf extension
                    return "application/pdf"

            return mime_type
        except Exception as e:
            print(f"Error detecting MIME type: {str(e)}")
            print(f"Attempting fallback detection for file: {filename}")
            # Fallback to extension-based detection
            if filename.lower().endswith(".pdf"):
                print("Fallback: Using application/pdf based on .pdf extension")
                return "application/pdf"
            elif filename.lower().endswith((".doc", ".docx")):
                print(
                    "Fallback: Using application/msword based on .doc/.docx extension"
                )
                return "application/msword"
            elif filename.lower().endswith(".txt"):
                print("Fallback: Using text/plain based on .txt extension")
                return "text/plain"
            else:
                raise ValueError(f"Could not determine MIME type for file: {filename}")

    def process_document(self, content: bytes, metadata: Dict) -> List[Dict]:
        """Process document and return chunks with metadata."""
        try:
            filename = metadata.get("filename", "")
            print(f"Processing document: {filename}")
            print(f"Content length: {len(content)} bytes")

            mime_type = self.get_mime_type(content, filename)
            print(f"Determined MIME type: {mime_type}")

            text = self.extract_text(content, mime_type)
            print(f"Extracted text length: {len(text)} characters")

            if not text.strip():
                raise ValueError("No text content extracted from document")

            # Create chunks from text
            chunks = self.create_chunks(text)
            print(f"Created {len(chunks)} chunks")

            # Process chunks with metadata
            processed_chunks = []
            for i, chunk in enumerate(chunks):
                chunk_data = {
                    "text": chunk,
                    "metadata": {
                        **metadata,
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                    },
                }
                processed_chunks.append(chunk_data)

            return processed_chunks
        except Exception as e:
            print(f"Error processing document: {str(e)}")
            raise
