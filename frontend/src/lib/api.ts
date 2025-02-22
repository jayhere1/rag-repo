import axios from "axios";

const API_URL = "http://localhost:8001/api";

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
    const formData = new FormData();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const response = await api.post("/auth/token", formData, {
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

export interface DocumentMetadata {
  owner: string;
  allowed_roles: string[];
  allowed_users: string[];
  filename: string;
  upload_time: string;
}

export interface Document {
  id: string;
  text: string;
  metadata: DocumentMetadata;
}

export interface QueryRequest {
  query: string;
  index_name: string;
  filters?: Record<string, any>;
}

export interface QueryResponse {
  answer: string;
  sources: Array<{
    text: string;
    metadata: Record<string, any>;
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
    return response.data;
  },

  delete: async (indexName: string, documentId: string): Promise<void> => {
    await api.delete(`/documents/${indexName}/${documentId}`);
  },

  upload: async (indexName: string, file: File, access: DocumentAccess) => {
    const formData = new FormData();
    formData.append("file", file);

    // Log what we're sending
    console.log("Uploading document with access:", access);

    // Send access data as form field
    formData.append(
      "access",
      JSON.stringify({
        access: {
          roles: access.roles,
          users: access.users,
        },
      })
    );

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
    const response = await api.post(
      `/documents/${request.index_name}/query`,
      request
    );
    return response.data;
  },
};
