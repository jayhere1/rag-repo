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

export const documents = {
  upload: async (
    indexName: string,
    file: File,
    metadata?: Record<string, any>
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    if (metadata) {
      formData.append("metadata", JSON.stringify(metadata));
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
