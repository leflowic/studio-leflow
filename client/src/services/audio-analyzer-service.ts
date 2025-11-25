import { AnalysisReport } from '@shared/types/audio-analyzer';
import { getAuthToken } from '@/lib/queryClient';

// Real implementation using Gemini AI via backend API
export const analyzeAudio = async (file: File): Promise<AnalysisReport> => {
  const formData = new FormData();
  formData.append('audio', file);

  const token = getAuthToken();
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/evlfrq/analyze', {
    method: 'POST',
    body: formData,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Greška pri analizi' }));
    throw new Error(error.error || 'Greška pri analizi audio fajla');
  }

  return response.json();
};
