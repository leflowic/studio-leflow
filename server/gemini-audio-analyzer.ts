import { GoogleGenAI } from "@google/genai";
import pLimit from "p-limit";
import pRetry from "p-retry";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
  },
});

function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

export interface AudioAnalysisResult {
  fileName: string;
  duration: string;
  detectedKey: string;
  summary: string;
  mixScore: number;
  mixGrade: string;
  issues: Array<{
    name: string;
    description: string;
    solution: string;
  }>;
  recommendations: string[];
  lufs: number;
  truePeak: number;
  stereoWidth: number;
  correlation: number;
  dynamicRange: number;
  transientScore: number;
  tonalBalance: {
    low: number;
    lowMid: number;
    highMid: number;
    high: number;
  };
  frequencyData: Array<{
    frequency: string;
    amplitude: number;
    isProblematic: boolean;
  }>;
}

const AUDIO_ANALYSIS_PROMPT = `Ti si EVLFRQ - profesionalni audio inženjer i mix analizator. Analiziraj ovaj audio fajl i daj detaljan izveštaj.

ANALIZIRAJ SLEDEĆE ASPEKTE:

1. FREKVENCIJSKI BALANS:
- Low (20-250Hz): Da li ima previše/premalo basa? Muddy? Boomy?
- Low-Mid (250-2kHz): Da li je mutno? Boxy? 
- High-Mid (2-8kHz): Da li je oštro? Harsh? Sibilant?
- High (8-20kHz): Da li ima dovoljno "air"? Previše šuma?

2. DINAMIKA:
- Da li je previše kompresovano (overcompressed)?
- Da li nedostaje kontrola (undercompressed)?
- Proceni dynamic range

3. STEREO SLIKA:
- Širina stereo polja
- Phase correlation (mono kompatibilnost)

4. PROBLEMI U MIKSU (detektuj sve):
- Boomy (80-150Hz previše)
- Muddy (150-300Hz previše)
- Boxy (250-500Hz rezonanca)
- Honky (500-1.2kHz megafon efekat)
- Nasal (800-1.5kHz nosni zvuk)
- Harsh (2k-5kHz oštrina)
- Sibilant (5k-8kHz previše S/SH)
- Thin (nedostaje telo)
- Clicks/Noise (šumovi, dahovi)
- Room problems (loša akustika sobe)

5. LOUDNESS:
- Proceni LUFS vrednost
- Proceni True Peak

ODGOVORI U TAČNO OVOM JSON FORMATU (bez markdown, samo čist JSON):
{
  "detectedKey": "A Minor",
  "duration": "3:45",
  "summary": "Kratak opis kvaliteta miksa na srpskom...",
  "mixScore": 75,
  "mixGrade": "B",
  "lufs": -14.0,
  "truePeak": -1.5,
  "stereoWidth": 80,
  "correlation": 0.92,
  "dynamicRange": 8.0,
  "transientScore": 70,
  "tonalBalance": {
    "low": 45,
    "lowMid": 55,
    "highMid": 60,
    "high": 40
  },
  "issues": [
    {
      "name": "Muddy",
      "description": "Opis problema na srpskom...",
      "solution": "Predlog rešenja sa EQ parametrima..."
    }
  ],
  "recommendations": [
    "Preporuka 1 na srpskom...",
    "Preporuka 2 na srpskom..."
  ]
}

PRAVILA ZA OCENJIVANJE:
- S (95-100): Profesionalni masterski kvalitet
- A (80-94): Odličan miks, spremno za release
- B (65-79): Dobar miks sa manjim problemima
- C (50-64): Prosečan miks, potrebne korekcije
- D (35-49): Ispod proseka, značajni problemi
- F (0-34): Loš miks, potreban remix

Ako ne možeš detaljno analizirati audio, daj procenu na osnovu onoga što čuješ.`;

export async function analyzeAudioWithGemini(
  audioBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<AudioAnalysisResult> {
  const limit = pLimit(1);

  const result = await limit(() =>
    pRetry(
      async () => {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                role: "user",
                parts: [
                  { text: AUDIO_ANALYSIS_PROMPT },
                  {
                    inlineData: {
                      mimeType,
                      data: audioBuffer.toString("base64"),
                    },
                  },
                ],
              },
            ],
          });

          const text = response.text || "";
          
          // Extract JSON from response
          let jsonStr = text;
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonStr = jsonMatch[0];
          }

          const parsed = JSON.parse(jsonStr);

          // Generate frequency data based on tonal balance
          const frequencyData = generateFrequencyData(parsed.tonalBalance, parsed.issues);

          return {
            fileName,
            duration: parsed.duration || "0:00",
            detectedKey: parsed.detectedKey || "Unknown",
            summary: parsed.summary || "Analiza završena.",
            mixScore: parsed.mixScore || 70,
            mixGrade: parsed.mixGrade || "B",
            issues: parsed.issues || [],
            recommendations: parsed.recommendations || [],
            lufs: parsed.lufs || -14.0,
            truePeak: parsed.truePeak || -1.0,
            stereoWidth: parsed.stereoWidth || 80,
            correlation: parsed.correlation || 0.9,
            dynamicRange: parsed.dynamicRange || 6.0,
            transientScore: parsed.transientScore || 70,
            tonalBalance: parsed.tonalBalance || {
              low: 50,
              lowMid: 50,
              highMid: 50,
              high: 50,
            },
            frequencyData,
          };
        } catch (error: any) {
          if (isRateLimitError(error)) {
            throw error;
          }
          console.error("[Gemini Audio Analysis] Error:", error);
          throw new pRetry.AbortError(error);
        }
      },
      {
        retries: 3,
        minTimeout: 2000,
        maxTimeout: 30000,
        factor: 2,
      }
    )
  );

  return result;
}

function generateFrequencyData(
  tonalBalance: { low: number; lowMid: number; highMid: number; high: number },
  issues: Array<{ name: string }>
): Array<{ frequency: string; amplitude: number; isProblematic: boolean }> {
  const frequencies = [
    "20Hz", "31Hz", "50Hz", "80Hz", "125Hz", "200Hz",
    "315Hz", "500Hz", "800Hz", "1.2kHz", "2kHz", "3.2kHz",
    "5kHz", "8kHz", "12.5kHz", "16kHz", "20kHz"
  ];

  const issueNames = issues.map((i) => i.name.toLowerCase());

  return frequencies.map((freq, idx) => {
    let baseAmplitude = -60;
    let isProblematic = false;

    // Adjust amplitude based on tonal balance
    if (idx < 4) {
      baseAmplitude = -50 + (tonalBalance.low - 50) * 0.3;
      if (issueNames.includes("boomy") && idx >= 2 && idx <= 3) {
        baseAmplitude += 10;
        isProblematic = true;
      }
    } else if (idx < 8) {
      baseAmplitude = -55 + (tonalBalance.lowMid - 50) * 0.3;
      if (issueNames.includes("muddy") && idx >= 4 && idx <= 5) {
        baseAmplitude += 8;
        isProblematic = true;
      }
      if (issueNames.includes("boxy") && idx >= 6 && idx <= 7) {
        baseAmplitude += 8;
        isProblematic = true;
      }
    } else if (idx < 13) {
      baseAmplitude = -58 + (tonalBalance.highMid - 50) * 0.3;
      if (issueNames.includes("harsh") && idx >= 10 && idx <= 12) {
        baseAmplitude += 10;
        isProblematic = true;
      }
    } else {
      baseAmplitude = -65 + (tonalBalance.high - 50) * 0.3;
      if (issueNames.includes("sibilant") && idx >= 13 && idx <= 14) {
        baseAmplitude += 8;
        isProblematic = true;
      }
    }

    // Add some randomness
    baseAmplitude += (Math.random() - 0.5) * 5;

    return {
      frequency: freq,
      amplitude: Math.round(baseAmplitude * 10) / 10,
      isProblematic,
    };
  });
}
