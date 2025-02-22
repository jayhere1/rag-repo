# RAG Application with Role-Based Access

A Retrieval Augmented Generation (RAG) application that supports multiple document indexes and role-based access control.

## Features

- Multiple vector indexes for different document collections
- Role-based access control for documents
- Support for PDF, DOCX, and text file uploads
- Azure OpenAI integration for embeddings and completions
- Weaviate vector database for efficient similarity search
- FastAPI backend with JWT authentication
- React frontend (coming soon)

## Prerequisites

- Python 3.8+
- Docker and Docker Compose
- Azure OpenAI API access

## Setup

1. Clone the repository and navigate to the project directory:
```bash
cd rag-app
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

4. Copy the environment example file and fill in your credentials:
```bash
cp .env.example .env
```
Edit `.env` with your Azure OpenAI credentials and other settings.

5. Start Weaviate using Docker Compose:
```bash
docker-compose up -d
```

6. Start the FastAPI server:
```bash
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

## API Documentation

Once the server is running, visit http://localhost:8000/docs for the interactive API documentation.

### Authentication

The system has two default users for testing:
- Admin user: username=admin, password=admin
- Regular user: username=user, password=user

Get a JWT token:
```bash
curl -X POST "http://localhost:8000/api/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin"
```

### Managing Indexes

Create a new index (admin only):
```bash
curl -X POST "http://localhost:8000/api/indexes/my-index" \
  -H "Authorization: Bearer {your-token}"
```

List available indexes:
```bash
curl "http://localhost:8000/api/indexes" \
  -H "Authorization: Bearer {your-token}"
```

### Working with Documents

Upload a document:
```bash
curl -X POST "http://localhost:8000/api/documents/my-index/upload" \
  -H "Authorization: Bearer {your-token}" \
  -F "file=@document.pdf"
```

Query documents:
```bash
curl -X POST "http://localhost:8000/api/documents/my-index/query" \
  -H "Authorization: Bearer {your-token}" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RAG?", "index_name": "my-index"}'
```

## Security Notes

- Change the default SECRET_KEY in production
- Use strong passwords
- Implement proper user management (currently using in-memory storage)
- Consider adding rate limiting
- Review and adjust CORS settings

## License

MIT
