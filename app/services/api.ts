import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5058/api",
  timeout: 300000, // 5 minutos
});

export interface AudioFile {
  id: string;
  fileName: string;
  fileUrl: string;
  summary: string;
  uploadedAt: string;
}

export const audioService = {
  getAll: async (): Promise<AudioFile[]> => {
    const { data } = await api.get<AudioFile[]>("/audio");
    return data;
  },

  upload: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/audio/upload", formData);
    return data;
  },

  download: async (id: string): Promise<Blob> => {
    const { data } = await api.get(`/audio/download/${id}`, {
      responseType: "blob",
    });
    return data;
  },
};
