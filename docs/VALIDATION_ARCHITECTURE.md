# Sistema de Validação de Áudio com Programação Paralela

## Arquitetura

### 1. Configuração de Domínio (`app/config/domain.ts`)
Define as regras de validação específicas do domínio. Para trocar de domínio, basta alterar `ACTIVE_DOMAIN`.

**Domínio Atual: Música**
- Valida presença de música e instrumentos
- Permite voz humana APENAS dentro do contexto musical
- Rejeita áudios com voz sem música (ex: podcasts, palestras)
- Duração: 10s - 10min
- Formatos: MP3, WAV, OGG

**Regras de Validação:**
- ✅ Música instrumental → Aceito
- ✅ Música cantada (voz + música) → Aceito
- ❌ Voz sem música (podcast, palestra) → Rejeitado
- ❌ Áudio sem instrumentos → Rejeitado

**Como trocar de domínio:**
```typescript
// Em domain.ts, trocar:
export const ACTIVE_DOMAIN = MUSIC_DOMAIN;
// Para:
export const ACTIVE_DOMAIN = MEDICAL_DOMAIN;
```

### 2. Validador de Áudio (`app/services/audioValidator.ts`)
Orquestra as validações:
- Formato do arquivo
- Duração do áudio
- Features de áudio (usando Web Worker)
- Validação contextual (voz + música)

### 3. Web Worker (`app/workers/audio-analyzer.worker.ts`)
**Programação Paralela**: Executa análise de áudio em thread separada para não bloquear a UI.

**Análises realizadas:**
- **Energy**: Detecta presença de som
- **Zero Crossing Rate (ZCR)**: Diferencia voz de música
- **Spectral Variance**: Detecta instrumentos musicais

### 4. Integração no Frontend (`app/routes/home.tsx`)
Valida o áudio antes de enviar ao servidor.

## Fluxo de Validação

1. Usuário seleciona arquivo
2. Ao submeter:
   - Valida formato e duração (síncrono)
   - Inicia Web Worker para análise de features (paralelo)
   - Worker analisa características do áudio
   - Verifica se voz está acompanhada de música
   - Retorna resultado da validação
3. Se válido: envia ao servidor
4. Se inválido: mostra erros ao usuário

## Vantagens da Arquitetura

✅ **Modular**: Fácil trocar domínio alterando apenas `ACTIVE_DOMAIN`  
✅ **Paralelo**: Web Worker não bloqueia UI durante análise  
✅ **Extensível**: Adicionar novos domínios criando novas configs  
✅ **Performático**: Validação no cliente reduz carga no servidor  
✅ **Contextual**: Valida combinação de features (voz + música)

## Criar Novo Domínio

```typescript
export const MEU_DOMINIO: DomainConfig = {
  name: "Meu Domínio",
  description: "Descrição",
  validations: {
    checkHumanVoice: true,
    checkMusic: false,
    checkInstruments: false,
    requireMusicWithVoice: false, // true = voz só com música
    minDuration: 5,
    maxDuration: 300,
    allowedFormats: ["audio/mpeg", "audio/wav"],
  },
  errorMessages: {
    notMusic: "Mensagem personalizada",
    noInstruments: "Mensagem personalizada",
    voiceWithoutMusic: "Mensagem personalizada",
    durationTooShort: "Mensagem personalizada",
    durationTooLong: "Mensagem personalizada",
    invalidFormat: "Mensagem personalizada",
  },
};
```

## Configurações Importantes

- `requireMusicWithVoice: true` → Voz só é aceita se houver música junto
- `checkMusic: true` → Valida presença de música
- `checkInstruments: true` → Valida presença de instrumentos
- `checkHumanVoice: true` → Exige presença de voz humana
