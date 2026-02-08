import { useState, useEffect } from "react";
import type { Route } from "./+types/home";

interface AudioFile {
  id: string;
  fileName: string;
  fileUrl: string;
  summary: string;
  uploadedAt: string;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Audio Upload" },
    { name: "description", content: "Upload and manage audio files" },
  ];
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  useEffect(() => {
    fetchAudioFiles();
  }, []);

  const fetchAudioFiles = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/audio");
      if (response.ok) {
        const data = await response.json();
        setAudioFiles(data);
      }
    } catch (error) {
      console.error("Erro ao carregar arquivos", error);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setMessage("Por favor, selecione um arquivo de áudio");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:5000/api/audio/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`Upload concluído! Resumo: ${data.summary}`);
        setFile(null);
        (e.target as HTMLFormElement).reset();
        fetchAudioFiles();
      } else {
        setMessage("Erro ao fazer upload do arquivo");
      }
    } catch (error) {
      setMessage("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Upload de Áudio
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione um arquivo de áudio
              </label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                disabled={loading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
            </div>

            {file && (
              <div className="text-sm text-gray-600">
                Arquivo selecionado: <span className="font-medium">{file.name}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !file}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Enviando...
                </>
              ) : (
                "Enviar Áudio"
              )}
            </button>
          </form>

          {message && (
            <div
              className={`mt-4 p-4 rounded-md ${
                message.includes("Erro")
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Áudios Processados
          </h2>

          {loadingFiles ? (
            <div className="flex justify-center py-8">
              <svg
                className="animate-spin h-8 w-8 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          ) : audioFiles.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhum áudio processado ainda
            </p>
          ) : (
            <div className="space-y-4">
              {audioFiles.map((audio) => (
                <div
                  key={audio.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1">
                        {audio.fileName}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Resumo:</span> {audio.summary}
                      </p>
                      <p className="text-xs text-gray-500">
                        Enviado em: {new Date(audio.uploadedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <a
                      href={audio.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
