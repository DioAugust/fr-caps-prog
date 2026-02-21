export interface DomainConfig {
  name: string;
  description: string;
  validations: {
    checkHumanVoice: boolean;
    checkMusic: boolean;
    checkInstruments: boolean;
    requireMusicWithVoice?: boolean;
    minDuration?: number;
    maxDuration?: number;
    allowedFormats?: string[];
  };
  errorMessages: {
    notMusic: string;
    noInstruments: string;
    voiceWithoutMusic: string;
    durationTooShort: string;
    durationTooLong: string;
    invalidFormat: string;
  };
}

export const MUSIC_DOMAIN: DomainConfig = {
  name: "Música",
  description: "Validação de arquivos de áudio musical",
  validations: {
    checkHumanVoice: false,
    checkMusic: true,
    checkInstruments: true,
    requireMusicWithVoice: true,
    minDuration: 10,
    maxDuration: 600,
    allowedFormats: ["audio/mpeg", "audio/wav", "audio/mp3", "audio/ogg"],
  },
  errorMessages: {
    notMusic: "O áudio não parece ser música",
    noInstruments: "Nenhum instrumento musical detectado",
    voiceWithoutMusic: "Voz detectada sem contexto musical (apenas músicas são permitidas)",
    durationTooShort: "Áudio muito curto (mínimo 10 segundos)",
    durationTooLong: "Áudio muito longo (máximo 10 minutos)",
    invalidFormat: "Formato de áudio não suportado",
  },
};

export const ACTIVE_DOMAIN = MUSIC_DOMAIN;
