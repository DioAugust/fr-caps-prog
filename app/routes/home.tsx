import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { audioService, type AudioFile } from "~/services/api";
import { AudioValidator } from "~/services/audioValidator";
import { ACTIVE_DOMAIN } from "~/config/domain";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Audio Upload" },
    { name: "description", content: "Upload and manage audio files" },
  ];
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState("");
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<Record<string, string>>({});
  const [isApplyingFilter, setIsApplyingFilter] = useState<string | null>(null);

  const handleDownload = async (audio: AudioFile) => {
    try {
      const blob = await audioService.download(audio.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = audio.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar arquivo", error);
    }
  };

  const handleDownloadTranscription = async (audio: AudioFile) => {
    try {
      const blob = await audioService.downloadTranscription(audio.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${audio.fileName.replace(/\.[^/.]+$/, "")}_transcription.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Erro ao baixar transcrição", error);
      if (error.response?.status === 400) {
        setMessage("Transcrição não disponível para este áudio");
      } else if (error.response?.status === 404) {
        setMessage("Transcrição não encontrada");
      } else {
        setMessage("Erro ao baixar transcrição");
      }
    }
  };

  const handleApplyFilter = async (audioId: string) => {
    try {
      setIsApplyingFilter(audioId);
      const filter = selectedFilter[audioId] || "bass";
      await audioService.applyFilter(audioId, filter);
      setMessage(`Filtro ${filter} aplicado com sucesso!`);
      await fetchAudioFiles();
    } catch (error) {
      console.error("Erro ao aplicar filtro:", error);
      setMessage("Erro ao aplicar filtro");
    } finally {
      setIsApplyingFilter(null);
    }
  };

  const handleDownloadFiltered = async (audio: AudioFile) => {
    try {
      const blob = await audioService.downloadFilteredAudio(audio.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = audio.fileName.replace(/\.[^/.]+$/, "") + "_filtered.mp3";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar áudio filtrado:", error);
      setMessage("Erro ao baixar áudio filtrado");
    }
  };

  useEffect(() => {
    fetchAudioFiles();
  }, []);

  const fetchAudioFiles = async () => {
    try {
      const data = await audioService.getAll();
      
      // Verificar status de transcrição para cada áudio
      const filesWithStatus = await Promise.all(
        data.map(async (audio) => {
          try {
            const status = await audioService.getTranscriptionStatus(audio.id);
            return { ...audio, transcriptionReady: status.isReady };
          } catch {
            return { ...audio, transcriptionReady: false };
          }
        })
      );
      
      setAudioFiles(filesWithStatus);
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

    setValidating(true);
    setMessage("Validando áudio...");

    try {
      const validation = await AudioValidator.validate(file);

      if (!validation.isValid) {
        setMessage(`Validação falhou:\n${validation.errors.join("\n")}`);
        setValidating(false);
        return;
      }

      setMessage("Áudio validado! Enviando...");
      setValidating(false);
      setLoading(true);

      const data = await audioService.upload(file);
      setMessage(`Upload concluído! Resumo: ${data.summary}`);
      setFile(null);
      (e.target as HTMLFormElement).reset();
      fetchAudioFiles();
    } catch (error) {
      console.error("Erro ao fazer upload", error);
      setMessage("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
      setValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Upload de Áudio - {ACTIVE_DOMAIN.name}
          </h1>
          <p className="text-sm text-gray-600 mb-6 text-center">
            {ACTIVE_DOMAIN.description}
          </p>

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
              disabled={loading || validating || !file}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading || validating ? (
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
                  {validating ? "Validando..." : "Enviando..."}
                </>
              ) : (
                "Enviar Áudio"
              )}
            </button>
          </form>

          {message && (
            <div
              className={`mt-4 p-4 rounded-md ${message.includes("Erro")
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
                  <div className="space-y-4">
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownloadTranscription(audio)}
                          disabled={!audio.transcriptionReady}
                          className="text-green-600 hover:text-green-800 text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                          title={audio.transcriptionReady ? "Baixar transcrição" : "Transcrição em processamento"}
                        >
                          Transcrição
                        </button>
                        <button
                          onClick={() => handleDownload(audio)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Áudio
                        </button>
                      </div>
                    </div>

                    {/* Preview de Áudio */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Áudio Original:</p>
                        <audio controls className="w-full h-8">
                          <source src={`http://localhost:5058/api/audio/download/${audio.id}`} type="audio/mpeg" />
                        </audio>
                      </div>
                      
                      {audio.filteredFileUrl && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Áudio Filtrado ({audio.filterType}):</p>
                          <audio controls className="w-full h-8">
                            <source src={`http://localhost:5058/api/audio/download/filtered/${audio.id}`} type="audio/mpeg" />
                          </audio>
                        </div>
                      )}
                    </div>

                    {/* Controles de Filtro */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <select
                        value={selectedFilter[audio.id] || "bass"}
                        onChange={(e) => setSelectedFilter({ ...selectedFilter, [audio.id]: e.target.value })}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="bass">Bass Boost</option>
                        <option value="treble">Treble Boost</option>
                        <option value="echo">Echo</option>
                        <option value="reverb">Reverb</option>
                        <option value="normalize">Normalize</option>
                      </select>
                      
                      <button
                        onClick={() => handleApplyFilter(audio.id)}
                        disabled={isApplyingFilter === audio.id}
                        className="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 disabled:bg-gray-400"
                      >
                        {isApplyingFilter === audio.id ? "Aplicando..." : "Aplicar Filtro"}
                      </button>
                      
                      {audio.filteredFileUrl && (
                        <button
                          onClick={() => handleDownloadFiltered(audio)}
                          className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                        >
                          Baixar Filtrado
                        </button>
                      )}
                    </div>
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
