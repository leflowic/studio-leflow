import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'wouter';
import { Button as ShadcnButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User as UserIcon, Upload, Activity, Settings, LogOut, 
  FileAudio, AlertTriangle, Cpu, BarChart3, Zap, Gauge, Layers, 
  Waves, Lock, Download, Eye, UploadCloud, CheckCircle2, Sliders,
  Mic2, Speaker, Radio, Info, ChevronDown, ChevronUp, Wrench, FileText,
  FileCheck, ShieldCheck, ArrowLeft
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';
import type { AnalysisReport } from '@shared/types/audio-analyzer';
import { analyzeAudio } from '@/services/audio-analyzer-service';
import evlfrqLogoDark from '@assets/EVLFRQ Logo plavi_1764050012231.png';
import evlfrqLogoLight from '@assets/EVLFRQ AVATAR WHITE_1764050012231.png';
import evlfrqLogoWhite from '@assets/Evlfrq logo beli_1764050012232.png';

const THEME = {
  glass: "bg-[#121212]/80 backdrop-blur-md border border-white/5 shadow-xl",
  activeNav: "bg-[#4F46E5] text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]",
  inactiveNav: "text-gray-400 hover:text-white hover:bg-white/5",
};

const INITIAL_SPECTRUM_DATA = Array.from({ length: 24 }, (_, i) => ({
  frequency: `${Math.floor(20 * Math.pow(1000, i / 24))}Hz`,
  amplitude: -60 - Math.random() * 20,
  isProblematic: false
}));

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}> = ({ children, className = '', variant = 'primary', size = 'md', loading = false, ...props }) => {
  const variants = {
    primary: "bg-[#4F46E5] hover:bg-[#4338ca] text-white shadow-lg shadow-indigo-500/30",
    secondary: "bg-white/10 hover:bg-white/20 text-white border border-white/10",
    outline: "bg-transparent border border-gray-600 text-gray-300 hover:border-gray-300 hover:text-white",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <button className={`${sizes[size]} rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${variants[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : children}
    </button>
  );
};

const Card: React.FC<{ children: React.ReactNode, className?: string, title?: string, icon?: any }> = ({ children, className = '', title, icon: Icon }) => (
  <div className={`rounded-2xl p-6 ${THEME.glass} ${className} flex flex-col`}>
    {title && (
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        {Icon && <Icon size={14} />} {title}
      </h3>
    )}
    {children}
  </div>
);

const SpectrumView: React.FC<{ data: AnalysisReport | null }> = ({ data }) => (
  <div className="h-full flex flex-col gap-6">
    <Card className="flex-1 min-h-[400px]" title="Real-Time FFT Analyzer" icon={Activity}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data?.frequencyData || INITIAL_SPECTRUM_DATA}>
          <defs>
            <linearGradient id="spectrumGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
          <XAxis dataKey="frequency" stroke="#444" tick={{fontSize: 10}} />
          <YAxis stroke="#444" tick={{fontSize: 10}} domain={[-80, 0]} label={{ value: 'dB', angle: -90, position: 'insideLeft' }} />
          <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} itemStyle={{ color: '#fff' }} />
          <Area type="monotone" dataKey="amplitude" stroke="#4F46E5" fill="url(#spectrumGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">Peak Freq</span>
        <span className="text-xl font-mono text-white">120 Hz</span>
      </Card>
      <Card className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">Slope</span>
        <span className="text-xl font-mono text-white">4.5 dB/oct</span>
      </Card>
      <Card className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">Floor</span>
        <span className="text-xl font-mono text-white">-72 dB</span>
      </Card>
    </div>
  </div>
);

const ResonanceView: React.FC<{ data: AnalysisReport | null }> = ({ data }) => {
  const chartData = data?.frequencyData || INITIAL_SPECTRUM_DATA;
  const spectralIssues = [
    { id: 'Boomy', range: '80-150 Hz', desc: 'Previše basa' },
    { id: 'Muddy', range: '150-300 Hz', desc: 'Mutno, nejasno' },
    { id: 'Boxy', range: '250-500 Hz', desc: 'Kutijast zvuk' },
    { id: 'Honky', range: '500-1.2k Hz', desc: 'Megafon efekat' },
    { id: 'Nasal', range: '800-1.5k Hz', desc: 'Nosni zvuk' },
    { id: 'Harsh', range: '2k-5k Hz', desc: 'Oštro, bolno' },
    { id: 'Sibilant', range: '5k-8k Hz', desc: 'Previše "S", "SH"' },
    { id: 'Airy', range: '10k+ Hz', desc: 'Previše šuma' },
    { id: 'Plosive', range: '80-150 Hz', desc: 'P/B udarci' },
    { id: 'Thin', range: '200-500 Hz', desc: 'Nedostaje telo' },
    { id: 'Overcompressed', range: 'Dynamics', desc: 'Bez dinamike' },
    { id: 'Undercompressed', range: 'Dynamics', desc: 'Nekontrolisano' },
    { id: 'Room', range: 'Reverb', desc: 'Loša akustika' },
    { id: 'Clicks', range: 'Noise', desc: 'Šumovi/Dahovi' },
  ];

  return (
    <div className="h-full flex flex-col md:flex-row gap-6">
      <div className="flex-1 flex flex-col gap-6">
        <Card className="flex-1 min-h-[300px]" title="Resonance & Q-Factor" icon={Zap}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="frequency" stroke="#444" tick={{fontSize: 10}} />
              <YAxis stroke="#444" tick={{fontSize: 10}} />
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
              <Bar dataKey="amplitude" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isProblematic ? '#EF4444' : '#333'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="w-full md:w-96 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle size={14} /> Spectral Character Matrix
        </h3>
        <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2" style={{maxHeight: '600px'}}>
           {spectralIssues.map(issue => {
             const detectedIssue = data?.issues.find(i => i.name.includes(issue.id));
             const isDetected = !!detectedIssue;
             
             return (
               <div key={issue.id} className={`rounded-xl border transition-all ${
                 isDetected 
                   ? 'bg-[#1a0505] border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)] ring-1 ring-red-500/20' 
                   : 'bg-white/5 border-white/5 hover:bg-white/10'
               }`}>
                 <div className="p-3">
                   <div className="flex justify-between items-center mb-1">
                     <span className={`font-bold flex items-center gap-2 ${isDetected ? 'text-red-400' : 'text-gray-300'}`}>
                        {isDetected && <AlertTriangle size={12} />}
                        {issue.id}
                     </span>
                     <span className="text-[10px] font-mono text-gray-500 bg-black/30 px-1.5 py-0.5 rounded border border-white/5">{issue.range}</span>
                   </div>
                   {!isDetected && <p className="text-xs text-gray-500">{issue.desc}</p>}
                 </div>

                 {isDetected && detectedIssue && (
                   <div className="bg-red-950/20 px-4 py-3 border-t border-red-500/10 rounded-b-xl">
                      <p className="text-xs text-red-200 mb-3 leading-relaxed">
                        {detectedIssue.description}
                      </p>

                      <div className="bg-[#000000]/60 rounded-lg p-3 border-l-2 border-indigo-500">
                        <div className="flex items-center gap-2 mb-1">
                           <Wrench size={12} className="text-indigo-400" />
                           <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Rešenje</span>
                        </div>
                        <p className="text-sm text-gray-200 font-medium">
                           {detectedIssue.solution}
                        </p>
                      </div>
                   </div>
                 )}
               </div>
             );
           })}
        </div>
      </div>
    </div>
  );
};

const TonalView: React.FC<{ data: AnalysisReport | null }> = ({ data }) => {
  const tb = data?.tonalBalance || { low: 40, lowMid: 50, highMid: 60, high: 40 };
  const bands = [
    { name: 'Low (20-250Hz)', value: tb.low, color: '#3B82F6' },
    { name: 'Low-Mid (250-2k)', value: tb.lowMid, color: '#10B981' },
    { name: 'High-Mid (2k-8k)', value: tb.highMid, color: '#F59E0B' },
    { name: 'High (8k-20k)', value: tb.high, color: '#EC4899' },
  ];

  return (
    <div className="h-full flex flex-col gap-6 justify-center">
      <div className="grid grid-cols-4 gap-4 h-96 items-end p-8 bg-[#0A0A0A] rounded-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-1/2 w-full h-0.5 border-t border-dashed border-white/30 z-10"></div>
        
        {bands.map((band, idx) => (
          <div key={idx} className="flex flex-col items-center gap-3 h-full justify-end group">
            <div className="relative w-full h-full bg-[#1a1a1a] rounded-xl overflow-hidden">
              <div 
                className="absolute bottom-0 w-full transition-all duration-1000 ease-out hover:opacity-90"
                style={{ height: `${band.value}%`, backgroundColor: band.color }}
              />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase">{band.name.split(' ')[0]}</span>
            <span className="text-lg font-mono font-bold text-white">{band.value}%</span>
          </div>
        ))}
      </div>
      <Card title="Target Curve Comparison">
        <p className="text-gray-400">Analiza pokazuje {tb.low > 60 ? 'pojačan' : 'balansiran'} Low End u odnosu na "Modern Pop" referencu.</p>
      </Card>
    </div>
  );
};

const LoudnessView: React.FC<{ data: AnalysisReport | null }> = ({ data }) => (
  <div className="h-full flex flex-col gap-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
       <Card title="Integrated LUFS" className="items-center justify-center py-12">
          <span className={`text-4xl md:text-5xl font-mono font-bold ${data && data.lufs > -9 ? 'text-red-500' : 'text-blue-400'}`}>
            {data?.lufs?.toFixed(1) || '-14.0'}
          </span>
          <span className="text-gray-500 text-sm mt-2">LUFS</span>
       </Card>
       <Card title="True Peak" className="items-center justify-center py-12">
          <span className={`text-4xl md:text-5xl font-mono font-bold ${data && data.truePeak > -1 ? 'text-red-500' : 'text-green-400'}`}>
            {data?.truePeak?.toFixed(1) || '-1.0'}
          </span>
          <span className="text-gray-500 text-sm mt-2">dBTP</span>
       </Card>
       <Card title="LRA (Range)" className="items-center justify-center py-12">
          <span className="text-4xl md:text-5xl font-mono font-bold text-yellow-400">
            {data?.dynamicRange?.toFixed(1) || '4.5'}
          </span>
          <span className="text-gray-500 text-sm mt-2">LU</span>
       </Card>
       <Card title="Crest Factor" className="items-center justify-center py-12">
          <span className="text-4xl md:text-5xl font-mono font-bold text-purple-400">12.2</span>
          <span className="text-gray-500 text-sm mt-2">dB</span>
       </Card>
    </div>
    <Card className="flex-1" title="Short-Term History">
       <div className="w-full h-full flex items-end gap-1 overflow-hidden opacity-50">
          {Array.from({length: 50}).map((_, i) => (
            <div key={i} className="flex-1 bg-blue-500/50 rounded-t-sm" style={{ height: `${20 + Math.random() * 40}%` }}></div>
          ))}
       </div>
    </Card>
  </div>
);

const StereoView: React.FC<{ data: AnalysisReport | null }> = ({ data }) => (
  <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card title="Vectorscope (Goniometer)" className="items-center justify-center relative overflow-hidden bg-black">
      <div className="w-64 h-64 rounded-full border border-white/10 relative flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-green-500/20 to-transparent animate-pulse rounded-full transform rotate-45 scale-75 blur-xl"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-green-500/20 to-transparent animate-pulse rounded-full transform -rotate-45 scale-50 blur-lg"></div>
        <div className="w-1 h-full bg-white/10 absolute top-0 left-1/2"></div>
        <div className="h-1 w-full bg-white/10 absolute top-1/2 left-0"></div>
        <span className="absolute top-2 text-xs text-gray-500 font-mono">+1</span>
        <span className="absolute bottom-2 text-xs text-gray-500 font-mono">-1</span>
      </div>
    </Card>
    <div className="flex flex-col gap-6">
      <Card title="Phase Correlation" className="items-center justify-center py-12">
        <span className="text-5xl font-mono font-bold text-green-400">{data?.correlation?.toFixed(2) || '0.92'}</span>
        <span className="text-gray-500 text-sm mt-2">Correlation</span>
      </Card>
      <Card title="Stereo Width" className="items-center justify-center py-12">
        <span className="text-5xl font-mono font-bold text-purple-400">{data?.stereoWidth?.toFixed(0) || '85'}%</span>
        <span className="text-gray-500 text-sm mt-2">Width</span>
      </Card>
    </div>
  </div>
);

interface EvlfrqSettings {
  fftResolution: '2048' | '4096' | '8192';
  lufsStandard: 'ebu' | 'itu';
  showGrid: boolean;
  autoAnalyze: boolean;
  showPeakMarkers: boolean;
  smoothingFactor: number;
}

const DEFAULT_SETTINGS: EvlfrqSettings = {
  fftResolution: '4096',
  lufsStandard: 'ebu',
  showGrid: true,
  autoAnalyze: false,
  showPeakMarkers: true,
  smoothingFactor: 0.8,
};

const loadSettings = (): EvlfrqSettings => {
  try {
    const saved = localStorage.getItem('evlfrq-settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load EVLFRQ settings:', e);
  }
  return DEFAULT_SETTINGS;
};

const saveSettings = (settings: EvlfrqSettings) => {
  try {
    localStorage.setItem('evlfrq-settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save EVLFRQ settings:', e);
  }
};

const SettingsView: React.FC<{
  settings: EvlfrqSettings;
  onSettingsChange: (settings: EvlfrqSettings) => void;
}> = ({ settings, onSettingsChange }) => {
  const [saved, setSaved] = React.useState(false);

  const handleChange = <K extends keyof EvlfrqSettings>(key: K, value: EvlfrqSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    onSettingsChange(newSettings);
    saveSettings(newSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    onSettingsChange(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Save indicator */}
      <div className={`fixed top-20 right-8 flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm transition-all duration-300 ${saved ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        <CheckCircle2 size={16} />
        Podešavanja sačuvana
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Audio Podešavanja" icon={Sliders}>
          <div className="space-y-5">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">FFT Rezolucija</label>
              <p className="text-xs text-gray-500 mt-1 mb-2">Veća rezolucija = preciznija analiza frekvencija</p>
              <select 
                value={settings.fftResolution}
                onChange={(e) => handleChange('fftResolution', e.target.value as EvlfrqSettings['fftResolution'])}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-all cursor-pointer"
                data-testid="select-fft-resolution"
              >
                <option value="2048" className="bg-[#121212]">2048 Tačaka (Brzo)</option>
                <option value="4096" className="bg-[#121212]">4096 Tačaka (Balansirano)</option>
                <option value="8192" className="bg-[#121212]">8192 Tačaka (Precizno)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">LUFS Standard</label>
              <p className="text-xs text-gray-500 mt-1 mb-2">Standard za merenje glasnoće</p>
              <select 
                value={settings.lufsStandard}
                onChange={(e) => handleChange('lufsStandard', e.target.value as EvlfrqSettings['lufsStandard'])}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-all cursor-pointer"
                data-testid="select-lufs-standard"
              >
                <option value="ebu" className="bg-[#121212]">EBU R128 (Evropa)</option>
                <option value="itu" className="bg-[#121212]">ITU-R BS.1770 (Globalni)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Smoothing Factor</label>
              <p className="text-xs text-gray-500 mt-1 mb-2">Izravnavanje spektra (0.0 - 1.0)</p>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1"
                  value={settings.smoothingFactor}
                  onChange={(e) => handleChange('smoothingFactor', parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4F46E5]"
                  data-testid="slider-smoothing"
                />
                <span className="text-sm font-mono text-white w-12 text-right">{settings.smoothingFactor.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Prikaz" icon={Eye}>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer group py-2">
              <div>
                <span className="text-sm text-gray-200 group-hover:text-white transition-colors">Prikaži Grid</span>
                <p className="text-xs text-gray-500">Mrežne linije na graficima</p>
              </div>
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={settings.showGrid}
                  onChange={(e) => handleChange('showGrid', e.target.checked)}
                  className="sr-only peer"
                  data-testid="toggle-show-grid"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:ring-2 peer-focus:ring-[#4F46E5] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F46E5]"></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group py-2">
              <div>
                <span className="text-sm text-gray-200 group-hover:text-white transition-colors">Peak Markeri</span>
                <p className="text-xs text-gray-500">Označi vrhove na spektru</p>
              </div>
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={settings.showPeakMarkers}
                  onChange={(e) => handleChange('showPeakMarkers', e.target.checked)}
                  className="sr-only peer"
                  data-testid="toggle-peak-markers"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:ring-2 peer-focus:ring-[#4F46E5] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F46E5]"></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group py-2">
              <div>
                <span className="text-sm text-gray-200 group-hover:text-white transition-colors">Auto Analiza</span>
                <p className="text-xs text-gray-500">Automatski analiziraj nakon učitavanja</p>
              </div>
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={settings.autoAnalyze}
                  onChange={(e) => handleChange('autoAnalyze', e.target.checked)}
                  className="sr-only peer"
                  data-testid="toggle-auto-analyze"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:ring-2 peer-focus:ring-[#4F46E5] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F46E5]"></div>
              </div>
            </label>
          </div>
        </Card>
      </div>

      {/* Additional settings */}
      <Card title="Sistem" icon={Wrench}>
        <div className="flex flex-wrap gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReset}
            className="gap-2"
            data-testid="button-reset-settings"
          >
            <Settings size={14} />
            Resetuj na Podrazumevano
          </Button>
          <div className="flex items-center gap-2 text-xs text-gray-500 ml-auto">
            <Info size={14} />
            Podešavanja se automatski čuvaju lokalno
          </div>
        </div>
      </Card>

      {/* Info card */}
      <Card title="O Podešavanjima" icon={Info}>
        <div className="text-sm text-gray-400 space-y-3">
          <p><strong className="text-gray-200">FFT Rezolucija:</strong> Određuje koliko detaljno se analizira frekvencijski spektar. Veće vrednosti daju preciznije rezultate ali mogu usporiti analizu.</p>
          <p><strong className="text-gray-200">LUFS Standard:</strong> EBU R128 je evropski standard, dok je ITU-R BS.1770 globalni. Oba mere integrisanu glasnoću ali sa malim razlikama u algoritmima.</p>
          <p><strong className="text-gray-200">Smoothing:</strong> Izravnava vizuelni prikaz spektra. Veće vrednosti = glatki grafici, niže vrednosti = odziv u realnom vremenu.</p>
        </div>
      </Card>
    </div>
  );
};

export default function AudioAnalyzerPage() {
  const { user, loginMutation } = useAuth();
  const { data: accessStatus, isLoading: accessLoading } = useQuery<{
    hasAccess: boolean;
    expiresAt: string | null;
    daysRemaining: number | null;
  }>({
    queryKey: ["/api/evlfrq/access-status"],
    enabled: !!user,
  });

  // Minimum loading animation time (5 seconds) + transition
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showApp, setShowApp] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; opacity: number; color: string }>>([]);
  
  useEffect(() => {
    // After 5 seconds, start transition
    const loadingTimer = setTimeout(() => {
      setIsTransitioning(true);
      
      // After transition animation (1 second), show app
      setTimeout(() => {
        setMinLoadingComplete(true);
        setShowApp(true);
      }, 1000);
    }, 5000);
    
    return () => clearTimeout(loadingTimer);
  }, []);

  // Particle effect that follows cursor during loading
  useEffect(() => {
    if (minLoadingComplete) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      
      // Create new particles on mouse move
      const newParticle = {
        id: Date.now() + Math.random(),
        x: e.clientX + (Math.random() - 0.5) * 20,
        y: e.clientY + (Math.random() - 0.5) * 20,
        size: Math.random() * 6 + 2,
        opacity: 1,
        color: Math.random() > 0.5 ? '#4F46E5' : '#818CF8'
      };
      
      setParticles(prev => [...prev.slice(-30), newParticle]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    // Fade out particles over time
    const fadeInterval = setInterval(() => {
      setParticles(prev => 
        prev
          .map(p => ({ ...p, opacity: p.opacity - 0.05, y: p.y - 1 }))
          .filter(p => p.opacity > 0)
      );
    }, 50);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(fadeInterval);
    };
  }, [minLoadingComplete]);

  const [currentView, setCurrentView] = useState('spectrum');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Settings state - loaded from localStorage
  const [settings, setSettings] = useState<EvlfrqSettings>(() => loadSettings());
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (!loginUsername || !loginPassword) {
      setLoginError('Unesite korisničko ime i lozinku');
      return;
    }

    loginMutation.mutate(
      { username: loginUsername, password: loginPassword },
      {
        onError: (error) => {
          setLoginError(error.message || 'Pogrešno korisničko ime ili lozinka');
        },
      }
    );
  };

  // ALWAYS show loading screen first (even for non-logged users)
  if (!minLoadingComplete) {
    return (
      <div 
        className={`fixed inset-0 bg-[#030308] flex items-center justify-center z-50 transition-all duration-1000 ${
          isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
        }`}
      >
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#4F46E5]/5 via-transparent to-[#4F46E5]/3" />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(79,70,229,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,0.3) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Logo with rotation and subtle glow */}
          <div className="relative mb-10">
            <div className="absolute inset-0 bg-[#4F46E5]/20 blur-[60px] scale-150" />
            <img 
              src={evlfrqLogoWhite} 
              alt="EVLFRQ" 
              className="relative w-20 h-20 object-contain"
              style={{
                animation: 'logoSpin 3s linear infinite'
              }}
            />
          </div>

          {/* Audio waveform animation */}
          <div className="flex items-end gap-[3px] h-12 mb-8">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="w-[3px] bg-gradient-to-t from-[#4F46E5] to-[#818CF8] rounded-full"
                style={{
                  animation: 'waveform 1s ease-in-out infinite',
                  animationDelay: `${i * 0.1}s`,
                  height: '8px'
                }}
              />
            ))}
          </div>

          {/* Text */}
          <h1 className="text-xl font-semibold text-white tracking-[0.3em] mb-3">
            EVLFRQ
          </h1>
          <p className="text-gray-500 text-xs tracking-widest uppercase">
            Audio Analysis Platform
          </p>

          {/* Progress bar */}
          <div className="mt-10 w-40 h-[2px] bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#4F46E5] rounded-full"
              style={{
                animation: 'progress 5s ease-out forwards'
              }}
            />
          </div>
        </div>

        {/* Animations */}
        <style>{`
          @keyframes logoSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes waveform {
            0%, 100% { height: 8px; opacity: 0.4; }
            50% { height: 32px; opacity: 1; }
          }
          @keyframes progress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  // After loading animation - check if user is logged in
  if (!user) {
    return (
      <div 
        className={`min-h-screen bg-gradient-to-br from-[#050505] via-[#0a0a15] to-[#0A0A0A] text-white flex flex-col transition-all duration-700 ${
          showApp ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{
          animation: showApp ? 'appFadeIn 0.7s ease-out forwards' : 'none'
        }}
      >
        <header className="h-14 border-b border-white/5 flex items-center px-8 bg-[#050505]/50 backdrop-blur-sm">
          <Link href="/">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all text-sm">
              <ArrowLeft size={16} />
              <span>Nazad</span>
            </button>
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Logo and branding */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-[#4F46E5]/20 rounded-full blur-3xl scale-150"></div>
                <img 
                  src={evlfrqLogoWhite} 
                  alt="EVLFRQ" 
                  className="relative w-24 h-24 mx-auto object-contain"
                />
              </div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                EVLFRQ
              </h1>
              <p className="text-gray-500 text-sm">Professional Audio Analysis Platform</p>
            </div>

            {/* Login form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div className={`rounded-2xl p-8 ${THEME.glass}`}>
                <h2 className="text-xl font-bold mb-6 text-center">Prijava</h2>
                
                {loginError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {loginError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username" className="text-gray-400 text-sm">
                      Korisničko ime ili Email
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="mt-2 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#4F46E5] focus:ring-[#4F46E5]"
                      placeholder="Unesite korisničko ime"
                      data-testid="input-evlfrq-username"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password" className="text-gray-400 text-sm">
                      Lozinka
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="mt-2 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#4F46E5] focus:ring-[#4F46E5]"
                      placeholder="Unesite lozinku"
                      data-testid="input-evlfrq-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loginMutation.isPending}
                  className="w-full mt-6"
                  data-testid="button-evlfrq-login"
                >
                  Prijavi se
                </Button>

                <p className="text-center text-gray-500 text-sm mt-6">
                  Nemaš nalog?{' '}
                  <Link href="/registracija" className="text-[#4F46E5] hover:text-[#6366F1] transition-colors">
                    Registruj se
                  </Link>
                </p>
              </div>
            </form>

            {/* Footer info */}
            <p className="text-center text-gray-600 text-xs mt-8">
              EVLFRQ je ekskluzivan audio analyzer dostupan samo za Studio LeFlow korisnike
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show simple loading while checking access status
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050505] via-[#0a0a15] to-[#0A0A0A] text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Proveravanje pristupa...</span>
        </div>
      </div>
    );
  }

  // Show access denied if no valid access
  if (!accessStatus?.hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050505] to-[#0A0A0A] text-white flex flex-col">
        <header className="h-14 border-b border-white/5 flex items-center px-8 bg-[#050505]/50 backdrop-blur-sm">
          <Link href="/">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all text-sm">
              <ArrowLeft size={16} />
              <span>Nazad</span>
            </button>
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <ShieldCheck className="w-16 h-16 mx-auto mb-6 text-yellow-500 opacity-50" />
            <h1 className="text-3xl font-bold mb-4">Pristup Nije Aktiviran</h1>
            <p className="text-gray-400 mb-8">
              EVLFRQ audio analizator je ekskluzivan alat koji zahteva aktivacijski ključ sa vremenskim ograničenjem.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Molimo vas da aktivirate ključ na vašem dashboard-u da biste pristupili alatu.
            </p>
            <Link href="/dashboard">
              <ShadcnButton className="w-full">Aktiviraj Ključ</ShadcnButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const processFile = async (file: File) => {
    if (!file.type.includes('audio')) {
      alert("Molimo vas da otpremite validan audio fajl (.mp3, .wav).");
      return;
    }

    const MAX_FILE_SIZE = 60 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      alert("Fajl je preveliki. Maksimalna dozvoljena veličina je 60MB.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeAudio(file);
      setReport(result);
      setCurrentView('resonance');
    } catch (err) {
      alert("Greška pri analizi! Pokušajte ponovo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportFix = () => {
    if (!report) return;

    const content = `
EVLFRQ | ENGINEERING LOG
=======================
Date: ${new Date().toLocaleDateString()}
File: ${report.fileName}
Mix Grade: ${report.mixGrade} (${report.mixScore}/100)
-----------------------

DETECTED ISSUES & SOLUTIONS:

${report.issues.map((issue, i) => `
[${i + 1}] ${issue.name.toUpperCase()}
Issue:    ${issue.description}
Solution: ${issue.solution}
`).join('\n')}

-----------------------
SUMMARY:
${report.summary}

-----------------------
Generated by EVLFRQ DSP Platform
Studio LeFlow
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EVLFRQ_Fix_Log_${report.fileName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const tools = [
    { id: 'spectrum', label: 'Spektar', icon: Activity },
    { id: 'resonance', label: 'Rezonancija', icon: Zap },
    { id: 'tonal', label: 'Tonalni Balans', icon: Gauge },
    { id: 'loudness', label: 'Glasnoća', icon: BarChart3 },
    { id: 'stereo', label: 'Stereo', icon: Waves },
  ];

  const renderContent = () => {
    if (!report) {
      return (
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`h-full min-h-[500px] flex items-center justify-center rounded-3xl border-2 border-dashed transition-all duration-300 ${
            isDragging 
              ? 'border-[#4F46E5] bg-[#4F46E5]/10 scale-[1.01]' 
              : 'border-white/10 hover:border-white/20 bg-[#0a0a0a]/50'
          }`}
        >
          <div className="text-center p-8">
            <div className="relative inline-block mb-6">
              <div className={`absolute inset-0 bg-[#4F46E5]/20 rounded-full blur-2xl transition-opacity ${isDragging ? 'opacity-100' : 'opacity-0'}`}></div>
              <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] rounded-2xl border border-white/10 flex items-center justify-center">
                <UploadCloud size={40} className={`transition-colors ${isDragging ? 'text-[#4F46E5]' : 'text-gray-500'}`} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Učitajte Audio Fajl</h2>
            <p className="text-gray-400 mb-6 max-w-sm mx-auto">
              Povucite .mp3 ili .wav fajl ovde, ili kliknite dugme ispod
            </p>
            <div className="flex flex-col items-center gap-3">
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                loading={isAnalyzing}
                className="pointer-events-auto min-w-[180px]"
              >
                {isAnalyzing ? 'Analiza u toku...' : 'Izaberi Fajl'}
              </Button>
              <p className="text-xs text-gray-600">Maksimalna veličina: 60MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Prepoznato - File Info */}
        <Card title="Prepoznato" icon={FileAudio}>
          <div className="space-y-4">
            {/* Tip Materijala - Prominentno prikazan */}
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center">
                {report.audioType?.includes('Vocal') ? <Mic2 size={24} className="text-white" /> :
                 report.audioType?.includes('Instrumental') || report.audioType?.includes('Beat') ? <Radio size={24} className="text-white" /> :
                 report.audioType?.includes('Mix') || report.audioType?.includes('Master') ? <Layers size={24} className="text-white" /> :
                 <Waves size={24} className="text-white" />}
              </div>
              <div>
                <p className="text-xl font-bold text-white">{report.audioType || 'Unknown'}</p>
                {report.audioTypeDetails && (
                  <p className="text-sm text-gray-400">{report.audioTypeDetails}</p>
                )}
              </div>
            </div>
            
            {/* Ostale informacije */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Naziv Fajla</span>
                <p className="text-white font-medium mt-1 truncate" title={report.fileName}>{report.fileName}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Trajanje</span>
                <p className="text-white font-mono font-medium mt-1">{report.duration}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Tonalitet</span>
                <p className="text-purple-400 font-medium mt-1">{report.detectedKey}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Dynamic Range</span>
                <p className="text-cyan-400 font-mono font-medium mt-1">{report.dynamicRange.toFixed(1)} dB</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Stereo / Mono</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-blue-400 font-mono font-medium">{report.stereoWidth}%</span>
                  <span className="text-gray-600">/</span>
                  <span className="text-orange-400 font-mono font-medium">{(100 - report.stereoWidth)}%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Ocena */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="items-center justify-center">
            <span className="text-xs text-gray-500 mb-2">Mix Grade</span>
            <span className={`text-4xl font-bold ${report.mixGrade === 'S' || report.mixGrade === 'A' ? 'text-green-400' : report.mixGrade === 'B' ? 'text-yellow-400' : 'text-red-400'}`}>
              {report.mixGrade}
            </span>
          </Card>
          <Card className="items-center justify-center">
            <span className="text-xs text-gray-500 mb-2">Score</span>
            <span className="text-2xl font-mono font-bold text-blue-400">{report.mixScore}/100</span>
          </Card>
          <Card className="items-center justify-center">
            <span className="text-xs text-gray-500 mb-2">Issues</span>
            <span className="text-2xl font-mono font-bold text-red-400">{report.issues.length}</span>
          </Card>
          <Card className="items-center justify-center">
            <span className="text-xs text-gray-500 mb-2">LUFS</span>
            <span className="text-2xl font-mono font-bold text-emerald-400">{report.lufs.toFixed(1)}</span>
          </Card>
        </div>

        {/* Problematične Rezonance / Issues */}
        {report.issues && report.issues.length > 0 && (
          <Card title="Problematične Rezonance" icon={AlertTriangle}>
            <div className="space-y-3">
              {report.issues.map((issue, index) => (
                <div key={index} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-lg uppercase">
                      {issue.name}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{issue.description}</p>
                  {issue.solution && (
                    <div className="flex items-start gap-2 mt-2 pt-2 border-t border-white/5">
                      <Wrench size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                      <p className="text-emerald-400 text-sm">{issue.solution}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {report.issues && report.issues.length === 0 && (
          <Card title="Problematične Rezonance" icon={CheckCircle2}>
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <CheckCircle2 size={24} className="text-emerald-400" />
              <p className="text-emerald-400 font-medium">Nisu pronađene problematične rezonance!</p>
            </div>
          </Card>
        )}

        {/* Rezime Analize - posle problema */}
        {report.summary && (
          <Card title="Rezime Analize" icon={Info}>
            <p className="text-gray-300">{report.summary}</p>
          </Card>
        )}

        <div className="h-96 bg-[#0A0A0A] rounded-2xl border border-white/10 p-6">
          {currentView === 'spectrum' && <SpectrumView data={report} />}
          {currentView === 'resonance' && <ResonanceView data={report} />}
          {currentView === 'tonal' && <TonalView data={report} />}
          {currentView === 'loudness' && <LoudnessView data={report} />}
          {currentView === 'stereo' && <StereoView data={report} />}
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`min-h-screen bg-gradient-to-br from-[#050505] to-[#0A0A0A] text-white flex transition-all duration-700 ${
        showApp ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
      style={{
        animation: showApp ? 'appFadeIn 0.7s ease-out forwards' : 'none'
      }}
    >
      {/* App fade-in animation */}
      <style>{`
        @keyframes appFadeIn {
          0% { 
            opacity: 0; 
            transform: scale(0.95) translateY(20px);
            filter: blur(10px);
          }
          50% {
            filter: blur(5px);
          }
          100% { 
            opacity: 1; 
            transform: scale(1) translateY(0);
            filter: blur(0);
          }
        }
      `}</style>
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#080808] flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <img src={evlfrqLogoDark} alt="EVLFRQ" className="w-10 h-10" />
            <div>
              <h1 className="font-bold text-lg">EVLFRQ</h1>
              <p className="text-xs text-gray-500">Audio Analysis</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3 px-4">Tools</div>
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setCurrentView(tool.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm ${
                  currentView === tool.id ? THEME.activeNav : THEME.inactiveNav
                }`}
              >
                <Icon size={18} /> {tool.label}
              </button>
            );
          })}
          
          <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3 px-4 mt-8">System</div>
          <button 
            onClick={() => setCurrentView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
              currentView === 'settings' ? THEME.activeNav : THEME.inactiveNav
            }`}
          >
            <Settings size={18} /> Podešavanja
          </button>
        </nav>

        <div className="p-4 border-t border-white/5 bg-[#0A0A0A]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-full flex items-center justify-center text-xs font-bold text-white">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate">{user?.username || 'User'}</p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                <p className="text-[10px] text-green-500 uppercase">Active</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {report && (
              <Button variant="success" size="sm" onClick={handleExportFix} className="w-full gap-2 text-xs">
                <Download size={14} /> Export Fix Log
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setReport(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }} 
              className="w-full gap-2 text-xs"
            >
              <Upload size={14} /> Nova Analiza
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-[#050505]/50 backdrop-blur-sm">
          <div className="flex items-center gap-6">
            <Link href="/">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all text-sm">
                <ArrowLeft size={16} />
                <span>Nazad</span>
              </button>
            </Link>
            <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> SYSTEM ONLINE
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
            <span>AUDIO ENGINE: READY</span>
            <span>v1.0.0 BUILD</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {currentView === 'settings' ? <SettingsView settings={settings} onSettingsChange={setSettings} /> : renderContent()}
        </div>
      </main>
    </div>
  );
}
