import { GoogleGenAI } from "@google/genai";
import pLimit from "p-limit";
import pRetry from "p-retry";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
  },
});

// Threshold for using File API vs inline upload (20MB)
const FILE_API_THRESHOLD = 20 * 1024 * 1024;

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
  audioType: string;  // Tip materijala: Raw Vocal, Processed Vocal, Full Mix, Instrumental, Beat, etc.
  audioTypeDetails: string;  // Dodatni detalji o tipu
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

const AUDIO_ANALYSIS_PROMPT = `You are EVLFRQ - a professional audio engineer and mix analyzer. Analyze this audio file.

CRITICAL - AUDIO TYPE DETECTION:
LISTEN CAREFULLY to the audio and determine EXACTLY what type of material this is. DO NOT GUESS - actually listen!

DECISION TREE:
1. Is there ANY vocal/voice in the audio?
   - YES, there is voice → Go to step 2
   - NO, only instruments/music → It's "Instrumental" or "Beat"

2. Is there music/beat behind the vocal?
   - YES, voice + music together → It's "Full Mix" or "Vocal Mix"  
   - NO, ONLY voice without any music → Go to step 3

3. Does the voice have effects (reverb, delay, autotune)?
   - YES, voice has effects but NO music → "Processed Vocal"
   - NO, dry/raw voice, you can hear room, breaths → "Raw Vocal"

AUDIO TYPES:
- "Raw Vocal" = ONLY voice, DRY, no effects, no reverb, no music. You hear room noise, breaths, natural sound.
- "Processed Vocal" = ONLY voice WITH effects (reverb, delay, autotune, compression) but NO music/beat behind it
- "Vocal Mix" = Voice WITH backing track/beat playing together
- "Full Mix" = Complete song with vocals + all instruments + full production
- "Instrumental" = Only instruments, NO vocals at all
- "Beat" = Hip-hop/trap/pop beat without vocals
- "Acapella" = Only vocals (one or more voices), no instruments
- "Stem" = Single element (only bass, only drums, only guitar)

ANALYZE:
1. Frequency Balance (Low 20-250Hz, Low-Mid 250-2kHz, High-Mid 2-8kHz, High 8-20kHz)
2. Dynamics (compression, dynamic range)
3. Stereo Image (width, correlation)
4. Issues (Boomy, Muddy, Boxy, Harsh, Sibilant, Room problems, etc.)
5. Loudness (LUFS, True Peak)

RESPOND IN THIS EXACT JSON FORMAT (no markdown, pure JSON only):
{
  "audioType": "Raw Vocal",
  "audioTypeDetails": "Male vocal, dry recording, room ambience audible, no effects",
  "detectedKey": "C Minor",
  "duration": "2:30",
  "summary": "Opis kvaliteta na srpskom jeziku...",
  "mixScore": 70,
  "mixGrade": "B",
  "lufs": -18.0,
  "truePeak": -3.0,
  "stereoWidth": 20,
  "correlation": 0.98,
  "dynamicRange": 12.0,
  "transientScore": 65,
  "tonalBalance": {"low": 30, "lowMid": 45, "highMid": 60, "high": 50},
  "issues": [{"name": "Room", "description": "Čuje se prostorija...", "solution": "Koristiti noise gate..."}],
  "recommendations": ["Preporuka na srpskom..."]
}

IMPORTANT RULES FOR audioType:
- If you hear ONLY a person speaking/singing with NO music = "Raw Vocal" or "Processed Vocal"
- "Raw Vocal" means DRY voice - no reverb, no delay, natural room sound
- "Processed Vocal" means voice HAS effects but still NO music behind it
- If there IS music/beat = "Full Mix", "Vocal Mix", or "Instrumental"/"Beat"
- Write summary, issues, recommendations in SERBIAN language

GRADING:
- S (95-100): Professional master quality
- A (80-94): Excellent, release ready
- B (65-79): Good with minor issues
- C (50-64): Average, needs corrections
- D (35-49): Below average
- F (0-34): Poor, needs remix`;

export async function analyzeAudioWithGemini(
  audioBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<AudioAnalysisResult> {
  const limit = pLimit(1);
  const fileSizeMB = audioBuffer.length / (1024 * 1024);
  
  console.log(`[EVLFRQ] Analyzing ${fileName} (${fileSizeMB.toFixed(2)}MB, ${mimeType})`);

  // For large files (>20MB), use File API if available
  const useLargeFileUpload = audioBuffer.length > FILE_API_THRESHOLD;
  
  if (useLargeFileUpload) {
    console.log(`[EVLFRQ] Using File API for large file (${fileSizeMB.toFixed(2)}MB)`);
  }

  const result = await limit(() =>
    pRetry(
      async () => {
        try {
          let response;
          
          if (useLargeFileUpload) {
            // For large files, save to temp file and use File API
            const tempDir = os.tmpdir();
            const tempFilePath = path.join(tempDir, `evlfrq-${Date.now()}-${fileName}`);
            
            try {
              // Write buffer to temp file
              fs.writeFileSync(tempFilePath, audioBuffer);
              console.log(`[EVLFRQ] Saved temp file: ${tempFilePath}`);
              
              // Upload file using File API
              const uploadedFile = await ai.files.upload({
                file: tempFilePath,
                config: {
                  mimeType: mimeType,
                }
              });
              
              console.log(`[EVLFRQ] File uploaded, URI: ${uploadedFile.uri}`);
              
              // Wait for file to be processed
              let file = uploadedFile;
              while (file.state === "PROCESSING") {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const fileInfo = await ai.files.get({ name: file.name! });
                file = fileInfo;
                console.log(`[EVLFRQ] File state: ${file.state}`);
              }
              
              if (file.state === "FAILED") {
                throw new Error("File processing failed");
              }
              
              // Generate content with uploaded file
              response = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: [
                  {
                    role: "user",
                    parts: [
                      { text: AUDIO_ANALYSIS_PROMPT },
                      {
                        fileData: {
                          fileUri: file.uri!,
                          mimeType: mimeType,
                        },
                      },
                    ],
                  },
                ],
              });
              
              // Clean up: delete the uploaded file from Gemini
              try {
                await ai.files.delete({ name: file.name! });
                console.log(`[EVLFRQ] Deleted file from Gemini: ${file.name}`);
              } catch (deleteError) {
                console.warn(`[EVLFRQ] Could not delete file from Gemini: ${deleteError}`);
              }
            } finally {
              // Always clean up temp file
              try {
                if (fs.existsSync(tempFilePath)) {
                  fs.unlinkSync(tempFilePath);
                  console.log(`[EVLFRQ] Deleted temp file: ${tempFilePath}`);
                }
              } catch (cleanupError) {
                console.warn(`[EVLFRQ] Could not delete temp file: ${cleanupError}`);
              }
            }
          } else {
            // For smaller files, use inline data (faster)
            response = await ai.models.generateContent({
              model: "gemini-2.0-flash",
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
          }

          const text = response.text || "";
          
          // Log raw Gemini response for debugging
          console.log(`[EVLFRQ] Raw Gemini response (first 500 chars): ${text.substring(0, 500)}`);
          
          // Extract JSON from response
          let jsonStr = text;
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonStr = jsonMatch[0];
          }

          const parsed = JSON.parse(jsonStr);
          
          // Log detected audio type
          console.log(`[EVLFRQ] Detected audioType: "${parsed.audioType}", details: "${parsed.audioTypeDetails}"`);

          // Generate frequency data based on tonal balance
          const frequencyData = generateFrequencyData(parsed.tonalBalance, parsed.issues);

          return {
            fileName,
            duration: parsed.duration || "0:00",
            detectedKey: parsed.detectedKey || "Unknown",
            audioType: parsed.audioType || "Unknown",
            audioTypeDetails: parsed.audioTypeDetails || "",
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
          throw error; // Let pRetry handle it
        }
      },
      {
        retries: 3,
        minTimeout: 2000,
        maxTimeout: 30000,
        factor: 2,
        onFailedAttempt: (error) => {
          console.log(`[EVLFRQ] Retry attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        },
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
