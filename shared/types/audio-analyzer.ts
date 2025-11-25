export enum UserRole {
  ADMIN = 'ADMIN',
  PRODUCER = 'PRODUCER',
}

export interface AccessControl {
  hasAccess: boolean;
  accessType?: '30_DAYS' | 'LIFETIME';
  expiresAt?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  access: AccessControl;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export interface AudioSettings {
  fftSize: 2048 | 4096 | 8192;
  refreshSpeed: 'fast' | 'medium' | 'slow';
  scale: 'log' | 'linear';
  windowing: 'Hann' | 'Blackman' | 'Rectangular';
  lufsStandard: 'EBU R128' | 'ITU-R BS.1770';
}

export interface DisplaySettings {
  theme: 'dark' | 'light';
  spectrumTheme: 'color' | 'heatmap' | 'classic';
  showGrid: boolean;
  defaultView: 'mono' | 'stereo';
}

export interface IssueItem {
  name: string;
  description: string;
  solution: string;
}

export interface AnalysisReport {
  fileName: string;
  duration: string;
  detectedKey: string;
  audioType: string;  // Tip materijala: Raw Vocal, Processed Vocal, Full Mix, Instrumental, Beat, etc.
  audioTypeDetails: string;  // Dodatni detalji o tipu (žanr, pol vokala, instrumenti)
  summary: string;
  mixScore: number;
  mixGrade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  issues: IssueItem[];
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
  frequencyData: {
    frequency: string;
    amplitude: number;
    isProblematic: boolean;
  }[];
}
