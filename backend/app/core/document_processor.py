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
        pdf_file = BytesIO(content)
        reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text

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

    def get_mime_type(self, content: bytes) -> str:
        """Detect MIME type of file content."""
        mime = magic.Magic(mime=True)
        return mime.from_buffer(content)

    def process_document(self, content: bytes, metadata: Dict) -> List[Dict]:
        """Process document and return chunks with metadata."""
        mime_type = self.get_mime_type(content)
        text = self.extract_text(content, mime_type)
        chunks = self.create_chunks(text)

        processed_chunks = []
        for i, chunk in enumerate(chunks):
            chunk_data = {
                "text": chunk,
                "metadata": {**metadata, "chunk_index": i, "total_chunks": len(chunks)},
            }
            processed_chunks.append(chunk_data)

        return processed_chunks
