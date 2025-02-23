import axios from "axios";

const API_URL = "/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  username: string;
  roles: string[];
}

export const auth = {
  login: async (credentials: LoginCredentials) => {
    // Create URLSearchParams for proper x-www-form-urlencoded format
    const formData = new URLSearchParams();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const response = await api.post("/auth/token", formData.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  },

  getUser: async (): Promise<User> => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};

export interface Index {
  name: string;
  description?: string;
}

export const indexes = {
  list: async () => {
    const response = await api.get("/indexes");
    return response.data;
  },

  create: async (name: string, description?: string) => {
    const response = await api.post(`/indexes/${name}`, { description });
    return response.data;
  },

  delete: async (name: string) => {
    const response = await api.delete(`/indexes/${name}`);
    return response.data;
  },
};

export interface DocumentAccess {
  roles: string[];
  users: string[];
}

export interface Chunk {
  id: string;
  text: string;
  index: number;
}

export interface DocumentMetadata {
  owner: string;
  allowed_roles: string[];
  allowed_users: string[];
  filename: string;
  upload_time: string;
  index_name: string;
  size: number;
  chunk_index: number;
  total_chunks: number;
  chunks?: Chunk[];
}

export interface Document {
  id: string;
  text: string;
  metadata: DocumentMetadata;
}

export interface QueryRequest {
  query: string;
  index_name?: string;
  filters?: Record<string, any>;
}

export interface QueryResponse {
  answer: string;
  sources: Array<{
    text: string;
    metadata: Record<string, any>;
    relevance?: number;
  }>;
}

export interface ListDocumentsResponse {
  documents: Document[];
}

export const documents = {
  list: async (
    indexName: string,
    page = 1,
    limit = 10
  ): Promise<ListDocumentsResponse> => {
    const response = await api.get(`/documents/${indexName}`, {
      params: { page, limit },
    });

    // Add index_name to each document's metadata
    // Ensure we preserve all original metadata fields while adding index_name
    const documents = response.data.documents.map((doc: Document) => {
      // First check if metadata exists and has the expected structure
      const metadata = doc.metadata || {};
      return {
        ...doc,
        metadata: {
          ...metadata,
          index_name: indexName,
          size: metadata.size || 0, // Ensure size is always present
        },
      };
    });

    return { documents };
  },

  delete: async (indexName: string, documentId: string): Promise<void> => {
    await api.delete(`/documents/${indexName}/${documentId}`);
  },

  upload: async (indexName: string, file: File, access: DocumentAccess) => {
    const formData = new FormData();
    formData.append("file", file);

    // Log request details
    console.log("Uploading document:", {
      file,
      indexName,
      access,
    });

    // Send access data as form field
    const accessData = {
      access: {
        roles: access.roles,
        users: access.users,
      },
    };

    // Log the stringified access data for debugging
    console.log("Access data to be sent:", JSON.stringify(accessData, null, 2));

    formData.append("access", JSON.stringify(accessData));

    // Log form data entries
    for (const [key, value] of formData.entries()) {
      console.log(`Form data entry - ${key}:`, value);
    }

    const response = await api.post(
      `/documents/${indexName}/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  query: async (request: QueryRequest): Promise<QueryResponse> => {
    const response = await api.post("/documents/query", request);
    console.log("Full API response:", {
      status: response.status,
      headers: response.headers,
      data: response.data,
    });

    // Ensure we're getting the expected data structure
    const data = response.data;
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format: expected object");
    }

    if (!("answer" in data) || !("sources" in data)) {
      throw new Error("Invalid response format: missing required fields");
    }

    if (!Array.isArray(data.sources)) {
      throw new Error("Invalid response format: sources must be an array");
    }

    return {
      answer: String(data.answer),
      sources: data.sources.map(
        (source: { text?: string; metadata?: Record<string, any> }) => ({
          text: String(source.text || ""),
          metadata: source.metadata || {},
        })
      ),
    };
  },
};
