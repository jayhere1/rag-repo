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
        text = []
        
        print(f"PDF has {len(reader.pages)} pages")
        
        # First try normal text extraction
        for i, page in enumerate(reader.pages):
            try:
                # Try direct text extraction first with different encodings
                page_text = ""
                try:
                    page_text = page.extract_text()
                except Exception as e:
                    print(f"Standard extraction failed for page {i+1}: {str(e)}")
                    try:
                        # Try extracting with layout preservation
                        page_text = page.extract_text(layout=True)
                    except Exception as e:
                        print(f"Layout extraction failed for page {i+1}: {str(e)}")
                
                # If direct extraction fails, try form fields
                if not page_text.strip() and "/AcroForm" in page:
                    try:
                        form_text = []
                        for field in page["/AcroForm"].get("/Fields", []):
                            if "/V" in field:
                                field_value = str(field["/V"])
                                # Try to decode if it's bytes
                                if isinstance(field_value, bytes):
                                    try:
                                        field_value = field_value.decode('utf-8', errors='ignore')
                                    except Exception:
                                        field_value = field_value.decode('latin-1', errors='ignore')
                                form_text.append(field_value)
                        page_text = "\n".join(form_text)
                    except Exception as e:
                        print(f"Form extraction failed for page {i+1}: {str(e)}")
                
                if page_text.strip():
                    # Clean up the text
                    cleaned_text = " ".join(page_text.split())  # Remove extra whitespace
                    text.append(cleaned_text)
                    print(f"Extracted {len(cleaned_text)} characters from page {i+1}")
                else:
                    print(f"No text extracted from page {i+1}")
            except Exception as e:
                print(f"Error extracting text from page {i+1}: {str(e)}")
                continue
        
        # If no text was extracted, try extracting from object streams
        if not text:
            print("No text extracted with normal methods, trying object stream extraction...")
            for i, page in enumerate(reader.pages):
                try:
                    # Try to get text from object streams with font handling
                    if "/Resources" in page:
                        # Get font information and encoding maps
                        fonts = {}
                        encoding_maps = {}
                        if "/Font" in page["/Resources"]:
                            font_dict = page["/Resources"]["/Font"]
                            for font_key, font_obj in font_dict.items():
                                if hasattr(font_obj, "get_object"):
                                    font = font_obj.get_object()
                                    if "/BaseFont" in font:
                                        fonts[font_key] = font["/BaseFont"]
                                        # Try to get font encoding
                                        if "/Encoding" in font:
                                            encoding = font["/Encoding"]
                                            if isinstance(encoding, str):
                                                encoding_maps[font_key] = encoding
                                            elif hasattr(encoding, "get_object"):
                                                enc_obj = encoding.get_object()
                                                if "/Differences" in enc_obj:
                                                    # Create custom encoding map
                                                    diff_array = enc_obj["/Differences"]
                                                    custom_map = {}
                                                    current_code = None
                                                    for item in diff_array:
                                                        if isinstance(item, int):
                                                            current_code = item
                                                        elif isinstance(item, str) and current_code is not None:
                                                            custom_map[current_code] = item
                                                            current_code += 1
                                                    encoding_maps[font_key] = custom_map

                        # Extract text from text objects
                        text_objects = []
                        contents = page.get_object().get("/Contents", [])
                        if not isinstance(contents, list):
                            contents = [contents]
                        
                        for obj in contents:
                            if hasattr(obj, "get_data"):
                                stream_data = obj.get_data()
                                # Try different encodings
                                for encoding in ['utf-8', 'latin-1', 'cp1252']:
                                    try:
                                        decoded = stream_data.decode(encoding, errors='ignore')
                                        # Find text with different text state operators
                                        import re
                                        # Match text between parentheses followed by text operators
                                        text_parts = []
                                        # Tj and TJ operators for simple text
                                        text_parts.extend(re.findall(r'\((.*?)\)\s*(Tj|TJ)', decoded))
                                        # BT and ET operators for text blocks
                                        text_blocks = re.findall(r'BT(.*?)ET', decoded, re.DOTALL)
                                        for block in text_blocks:
                                            # Extract text within the block
                                            block_parts = re.findall(r'\((.*?)\)\s*(Tj|TJ)', block)
                                            text_parts.extend(block_parts)
                                        if text_parts:
                                            # Clean and join text parts
                                            cleaned_parts = []
                                            for part in text_parts:
                                                text = part[0]
                                                # Get current font from text state
                                                font_match = re.search(r'/([A-Za-z0-9+]+)\s+\d+\s+Tf', block)
                                                current_font = font_match.group(1) if font_match else None
                                                
                                                # Apply font encoding if available
                                                if current_font and current_font in encoding_maps:
                                                    encoding_map = encoding_maps[current_font]
                                                    if isinstance(encoding_map, dict):
                                                        # Apply custom encoding map
                                                        chars = []
                                                        i = 0
                                                        while i < len(text):
                                                            if text[i] == '\\':
                                                                if i + 1 < len(text) and text[i + 1] in ['(', ')']:
                                                                    chars.append(text[i + 1])
                                                                    i += 2
                                                                elif i + 3 < len(text) and text[i + 1:i + 4].isdigit():
                                                                    # Handle octal character codes
                                                                    code = int(text[i + 1:i + 4], 8)
                                                                    if code in encoding_map:
                                                                        chars.append(encoding_map[code])
                                                                    else:
                                                                        chars.append(chr(code))
                                                                    i += 4
                                                                else:
                                                                    chars.append(text[i])
                                                                    i += 1
                                                            else:
                                                                chars.append(text[i])
                                                                i += 1
                                                        text = ''.join(chars)
                                                    else:
                                                        # Handle standard encodings
                                                        try:
                                                            text = text.encode('latin1').decode(encoding_map)
                                                        except Exception:
                                                            pass
                                                
                                                cleaned_parts.append(text)
                                            text_objects.extend(cleaned_parts)
                                        break
                                    except Exception:
                                        continue
                        
                        if text_objects:
                            cleaned_text = " ".join(text_objects)
                            text.append(cleaned_text)
                            print(f"Extracted {len(cleaned_text)} characters from page {i+1} using object stream method")
                except Exception as e:
                    print(f"Error in object stream extraction for page {i+1}: {str(e)}")
                    continue
        
        full_text = "\n\n".join(text)
        if not full_text.strip():
            raise ValueError("Could not extract any text from PDF - the file might be scanned or protected")
        
        print(f"Total extracted text length: {len(full_text)}")
        return full_text

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
            return mime_type
        except Exception as e:
            print(f"Error detecting MIME type: {str(e)}")
            # Fallback to extension-based detection
            if filename.lower().endswith('.pdf'):
                return 'application/pdf'
            elif filename.lower().endswith(('.doc', '.docx')):
                return 'application/msword'
            elif filename.lower().endswith('.txt'):
                return 'text/plain'
            else:
                raise ValueError(f"Could not determine MIME type for file: {filename}")

    def process_document(self, content: bytes, metadata: Dict, mime_type: str = None, chunk_size_mb: int = 10) -> List[Dict]:
        """Process document and return chunks with metadata."""
        try:
            filename = metadata.get('filename', '')
            print(f"Processing document: {filename}")
            print(f"Content length: {len(content)} bytes")
            print(f"Content type: {type(content)}")
            print(f"MIME type: {mime_type}")
            print(f"Metadata: {metadata}")
            
            # Process large files in chunks to avoid memory issues
            chunk_size_bytes = chunk_size_mb * 1024 * 1024
            if len(content) > chunk_size_bytes and mime_type and "pdf" in mime_type.lower():
                print(f"Large PDF detected, processing in chunks of {chunk_size_mb}MB")
                pdf_file = BytesIO(content)
                reader = PyPDF2.PdfReader(pdf_file)
                total_pages = len(reader.pages)
                
                all_chunks = []
                current_text = []
                current_size = 0
                
                for i in range(total_pages):
                    try:
                        page = reader.pages[i]
                        page_text = page.extract_text()
                        if page_text.strip():
                            current_text.append(page_text)
                            current_size += len(page_text.encode('utf-8'))
                            
                            # Process accumulated text if it exceeds chunk size
                            if current_size >= chunk_size_bytes:
                                text_to_process = "\n\n".join(current_text)
                                chunks = self.create_chunks(text_to_process)
                                all_chunks.extend(chunks)
                                current_text = []
                                current_size = 0
                    except Exception as e:
                        print(f"Error processing page {i+1}: {str(e)}")
                        continue
                
                # Process any remaining text
                if current_text:
                    text_to_process = "\n\n".join(current_text)
                    chunks = self.create_chunks(text_to_process)
                    all_chunks.extend(chunks)
                
                if not all_chunks:
                    raise ValueError("No text content extracted from document")
                
                # Process chunks with metadata
                processed_chunks = []
                for i, chunk in enumerate(all_chunks):
                    chunk_data = {
                        "text": chunk,
                        "metadata": {**metadata, "chunk_index": i, "total_chunks": len(all_chunks)},
                    }
                    processed_chunks.append(chunk_data)
                
                return processed_chunks
            else:
                # Process smaller files normally
                try:
                    text = self.extract_text(content, mime_type)
                    print(f"Extracted text length: {len(text)} characters")
                except Exception as e:
                    print(f"Error extracting text: {str(e)}")
                    raise ValueError(f"Failed to extract text: {str(e)}")
                
                if not text.strip():
                    raise ValueError("No text content extracted from document")
                
                try:
                    # Create chunks from text
                    chunks = self.create_chunks(text)
                    print(f"Created {len(chunks)} chunks")
                    
                    # Process chunks with metadata
                    processed_chunks = []
                    for i, chunk in enumerate(chunks):
                        chunk_data = {
                            "text": chunk,
                            "metadata": {**metadata, "chunk_index": i, "total_chunks": len(chunks)},
                        }
                        processed_chunks.append(chunk_data)
                    
                    return processed_chunks
                except Exception as e:
                    print(f"Error processing chunks: {str(e)}")
                    raise ValueError(f"Failed to process chunks: {str(e)}")
        except Exception as e:
            print(f"Error in process_document: {type(e).__name__}: {str(e)}")
            raise
