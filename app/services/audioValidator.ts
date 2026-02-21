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
    return new Promise((resolve) => {
      const worker = new Worker(
        new URL("../workers/audio-analyzer.worker.ts", import.meta.url),
        { type: "module" }
      );

      const reader = new FileReader();
      reader.onload = (e) => {
        worker.postMessage({
          audioData: e.target?.result,
          config: ACTIVE_DOMAIN.validations,
        });
      };

      worker.onmessage = (e) => {
        resolve(e.data);
        worker.terminate();
      };

      reader.readAsArrayBuffer(file);
    });
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
    }

    return {
      isValid: errors.length === 0,
      errors,
      details,
    };
  }
}
