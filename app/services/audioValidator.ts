import { ACTIVE_DOMAIN } from "~/config/domain";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  details?: {
    duration?: number;
    format?: string;
    hasMusic?: boolean;
    hasVoice?: boolean;
    hasInstruments?: boolean;
  };
}

export class AudioValidator {
  private static async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        window.URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      };
      audio.onerror = () => reject(new Error("Erro ao carregar áudio"));
      audio.src = window.URL.createObjectURL(file);
    });
  }

  private static async analyzeAudioFeatures(file: File): Promise<{
    hasMusic: boolean;
    hasVoice: boolean;
    hasInstruments: boolean;
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          const channelData = audioBuffer.getChannelData(0);
          
          // Análise de features
          const energy = this.calculateEnergy(channelData);
          const zcr = this.calculateZCR(channelData);
          const spectralVariance = this.calculateSpectralVariance(channelData);
          
          // Heurísticas para classificação
          const hasMusic = energy > 0.01 && spectralVariance > 0.05;
          const hasVoice = zcr > 0.1 && zcr < 0.3;
          const hasInstruments = spectralVariance > 0.1 && energy > 0.02;
          
          resolve({ hasMusic, hasVoice, hasInstruments });
        } catch (error) {
          console.error("Erro ao decodificar áudio:", error);
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsArrayBuffer(file);
    });
  }

  private static calculateEnergy(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return sum / data.length;
  }

  private static calculateZCR(data: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i] >= 0 && data[i - 1] < 0) || (data[i] < 0 && data[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / data.length;
  }

  private static calculateSpectralVariance(data: Float32Array): number {
    const fftSize = 2048;
    let variance = 0;
    let count = 0;
    
    for (let i = 0; i < data.length - fftSize; i += fftSize) {
      const slice = data.slice(i, i + fftSize);
      const magnitude = this.calculateMagnitude(slice);
      variance += magnitude;
      count++;
    }
    
    return count > 0 ? variance / count : 0;
  }

  private static calculateMagnitude(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += Math.abs(data[i]);
    }
    return sum / data.length;
  }

  static async validate(file: File): Promise<ValidationResult> {
    const errors: string[] = [];
    const details: ValidationResult["details"] = {};

    // Validar formato
    if (ACTIVE_DOMAIN.validations.allowedFormats) {
      if (!ACTIVE_DOMAIN.validations.allowedFormats.includes(file.type)) {
        errors.push(ACTIVE_DOMAIN.errorMessages.invalidFormat);
      }
    }
    details.format = file.type;

    // Validar duração
    try {
      const duration = await this.getAudioDuration(file);
      details.duration = duration;

      if (
        ACTIVE_DOMAIN.validations.minDuration &&
        duration < ACTIVE_DOMAIN.validations.minDuration
      ) {
        errors.push(ACTIVE_DOMAIN.errorMessages.durationTooShort);
      }

      if (
        ACTIVE_DOMAIN.validations.maxDuration &&
        duration > ACTIVE_DOMAIN.validations.maxDuration
      ) {
        errors.push(ACTIVE_DOMAIN.errorMessages.durationTooLong);
      }
    } catch (error) {
      errors.push("Erro ao processar áudio");
    }

    // Análise de features com Web Worker (paralelo)
    try {
      const features = await this.analyzeAudioFeatures(file);
      details.hasMusic = features.hasMusic;
      details.hasVoice = features.hasVoice;
      details.hasInstruments = features.hasInstruments;

      if (ACTIVE_DOMAIN.validations.checkMusic && !features.hasMusic) {
        errors.push(ACTIVE_DOMAIN.errorMessages.notMusic);
      }

      if (ACTIVE_DOMAIN.validations.checkInstruments && !features.hasInstruments) {
        errors.push(ACTIVE_DOMAIN.errorMessages.noInstruments);
      }

      if (ACTIVE_DOMAIN.validations.requireMusicWithVoice && features.hasVoice && !features.hasMusic) {
        errors.push(ACTIVE_DOMAIN.errorMessages.voiceWithoutMusic);
      }

      if (ACTIVE_DOMAIN.validations.checkHumanVoice && !features.hasVoice) {
        errors.push("Nenhuma voz humana detectada");
      }
    } catch (error) {
      console.error("Erro na análise de features:", error);
      // Não bloquear upload se análise falhar
    }

    return {
      isValid: errors.length === 0,
      errors,
      details,
    };
  }
}
