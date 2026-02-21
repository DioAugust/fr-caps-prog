self.onmessage = async (e: MessageEvent) => {
  const { audioData, config } = e.data;

  try {
    const audioContext = new OfflineAudioContext(1, 44100, 44100);
    const audioBuffer = await audioContext.decodeAudioData(audioData);
    
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Análise de features de áudio
    const features = analyzeAudioFeatures(channelData, sampleRate, config);
    
    self.postMessage(features);
  } catch (error) {
    self.postMessage({
      hasMusic: false,
      hasVoice: false,
      hasInstruments: false,
    });
  }
};

function analyzeAudioFeatures(
  data: Float32Array,
  sampleRate: number,
  config: any
): { hasMusic: boolean; hasVoice: boolean; hasInstruments: boolean } {
  // Calcular energia do sinal
  const energy = calculateEnergy(data);
  
  // Calcular Zero Crossing Rate (detecta voz vs música)
  const zcr = calculateZCR(data);
  
  // Calcular variação espectral (detecta instrumentos)
  const spectralVariance = calculateSpectralVariance(data);
  
  // Heurísticas simples para classificação
  const hasMusic = energy > 0.01 && spectralVariance > 0.05;
  const hasVoice = zcr > 0.1 && zcr < 0.3; // Voz tem ZCR moderado
  const hasInstruments = spectralVariance > 0.1 && energy > 0.02;
  
  return { hasMusic, hasVoice, hasInstruments };
}

function calculateEnergy(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return sum / data.length;
}

function calculateZCR(data: Float32Array): number {
  let crossings = 0;
  for (let i = 1; i < data.length; i++) {
    if ((data[i] >= 0 && data[i - 1] < 0) || (data[i] < 0 && data[i - 1] >= 0)) {
      crossings++;
    }
  }
  return crossings / data.length;
}

function calculateSpectralVariance(data: Float32Array): number {
  const fftSize = 2048;
  let variance = 0;
  let count = 0;
  
  for (let i = 0; i < data.length - fftSize; i += fftSize) {
    const slice = data.slice(i, i + fftSize);
    const magnitude = calculateMagnitude(slice);
    variance += magnitude;
    count++;
  }
  
  return count > 0 ? variance / count : 0;
}

function calculateMagnitude(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += Math.abs(data[i]);
  }
  return sum / data.length;
}

export {};
