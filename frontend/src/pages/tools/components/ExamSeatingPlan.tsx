import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Download, Users, Trash2, CheckCircle2,
  Calendar, Building2, FileSpreadsheet, Settings2,
  ArrowRight, ArrowLeft, LayoutGrid, List, Printer, Edit3,
  X, Plus, RefreshCw, Search, Shuffle,
  Undo2, ChevronUp, ChevronDown, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

// raw: false seçəndə XLSX həmişə string qaytarır; boş cell undefined ola bilər
type CellValue = string | undefined;
type SeatingType = 'A' | 'B' | 'C';
type SortField = 'firstName' | 'lastName' | 'grade' | 'schoolName' | 'center' | 'patronymic' | 'rayon';
type Step = 'upload' | 'mapping' | 'review' | 'config' | 'results';

interface Student {
  id: string;
  center: string;
  utisCode: string;
  firstName: string;
  lastName: string;
  patronymic?: string;  // atasının adı
  rayon?: string;       // rayon
  childId?: string;     // uşaq İD
  grade: string;
  schoolName: string;
  section: string;
  gender: 'K' | 'Q';
  note?: string;
}

interface Seat {
  seatNumber: number;
  deskNumber: number;
  position: 'Sol' | 'Sağ';
  type: 'CÜT' | 'TƏK' | 'BOŞ';
  student?: Student;
}

interface RoomConfig {
  id: string;
  name: string;
  columns: number;
  rowsPerColumn: number;
  totalDesks?: number;
  proctors?: string;
}

interface RoomStats {
  totalStudents: number;
  usedSeats: number;
  emptySeats: number;
  singleCount: number;
  doubleCount: number;
  utisViolations: number;
  riskScore: number;
  riskStatus: 'Təhlükəsiz' | 'Orta Risk' | 'Yüksək Risk';
}

interface RoomResult {
  config: RoomConfig;
  seats: Seat[];
  stats: RoomStats;
}

interface CenterResult {
  centerName: string;
  rooms: RoomResult[];
}

interface HistoryEntry {
  id: number;
  name: string;
  date: string;
  studentCount: number;
  centerCount: number;
  students: Student[];
  centerConfigs: Record<string, RoomConfig[]>;
  results: CenterResult[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_ORDER: Step[] = ['upload', 'mapping', 'review', 'config', 'results'];

const SEATING_TYPES: { type: SeatingType; label: string; desc: string }[] = [
  { type: 'A', label: 'UTİS Maks. Ayrılması', desc: 'Eyni məktəb şagirdlərini ən uzaq yerlərə' },
  { type: 'B', label: 'Sinif Balansı',        desc: 'Eyni sinif şagirdlərini daha güclü qarışdırır' },
  { type: 'C', label: 'Bölmə Ayırması',       desc: 'Az bölməsi əvvəl doldurulur, Rus sonra' },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const autoDetectMapping = (headers: string[]): Record<string, number> => {
  const mapping: Record<string, number> = {
    center: 0, lastName: 1, firstName: 2, patronymic: 3,
    rayon: 4, childId: 5, section: 6, grade: 7,
    schoolName: 8, utisCode: 9, gender: 10, note: 11,
  };
  const patterns: Record<string, RegExp> = {
    center:     /mərkəz|center|imtahan/i,
    lastName:   /soyad|surname|last.?name/i,
    firstName:  /^ad$|first.?name|şagirdin\s*ad/i,
    patronymic: /atasın|ata.?ad|patrony|father/i,
    rayon:      /rayon|район|district/i,
    childId:    /uşaq.?id|şagird.?id|child.?id|şəxs.?id/i,
    section:    /tədris.?dil|bölmə|section|dil|şöbə/i,
    grade:      /tədris.?sinf|sinif|qrup|grade|class/i,
    schoolName: /təhsil.?müəssisə|məktəb|school|oxuduğu/i,
    utisCode:   /müəssisəsinin.?id|utis|kod|code/i,
    gender:     /cins|gender|sex/i,
    note:       /qeyd|note|remark/i,
  };
  headers.forEach((h, idx) => {
    const header = h ?? '';
    for (const [key, pattern] of Object.entries(patterns)) {
      if (pattern.test(header)) mapping[key] = idx;
    }
  });
  return mapping;
};

const getGradeColor = (grade: string): string => {
  const colors = [
    'bg-blue-100 border-blue-300 text-blue-800',
    'bg-indigo-100 border-indigo-300 text-indigo-800',
    'bg-purple-100 border-purple-300 text-purple-800',
    'bg-pink-100 border-pink-300 text-pink-800',
    'bg-orange-100 border-orange-300 text-orange-800',
    'bg-amber-100 border-amber-300 text-amber-800',
    'bg-emerald-100 border-emerald-300 text-emerald-800',
    'bg-cyan-100 border-cyan-300 text-cyan-800',
    'bg-sky-100 border-sky-300 text-sky-800',
    'bg-violet-100 border-violet-300 text-violet-800',
  ];
  let hash = 0;
  for (let i = 0; i < grade.length; i++) hash = grade.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const PRINT_CARD_CSS = `
  body { margin: 0; }
  .card {
    width: 45%; height: 250px; border: 2px solid #333; margin: 10px;
    display: inline-block; padding: 15px; font-family: sans-serif;
    position: relative; border-radius: 10px; page-break-inside: avoid;
    vertical-align: top;
  }
  .header { font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; color: #1e40af; }
  .row { margin: 5px 0; font-size: 14px; }
  .label { font-size: 10px; color: #666; text-transform: uppercase; }
  .utis-badge {
    position: absolute; bottom: 15px; right: 15px;
    border: 2px solid #333; padding: 4px 8px;
    font-family: monospace; font-size: 13px; font-weight: bold; border-radius: 4px;
  }
`;

// Köhnə planlar: BOŞ seat-lər array-də yox idi → swap işləmirdi. Migration əlavə edir.
const migrateResults = (raw: CenterResult[]): CenterResult[] =>
  raw.map(center => ({
    ...center,
    rooms: center.rooms.map(room => {
      const deskCount = room.config.totalDesks ?? (room.config.columns * room.config.rowsPerColumn);
      const fullSeats: Seat[] = [];
      for (let d = 1; d <= deskCount; d++) {
        (['Sol', 'Sağ'] as const).forEach(pos => {
          const existing = room.seats.find(s => s.deskNumber === d && s.position === pos);
          fullSeats.push(existing ?? {
            seatNumber: fullSeats.length + 1,
            deskNumber: d,
            position: pos,
            type: 'BOŞ',
          });
        });
      }
      return { ...room, seats: fullSeats };
    }),
  }));

// ─── Component ────────────────────────────────────────────────────────────────

const ExamSeatingPlan: React.FC = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({
    center: 0, lastName: 1, firstName: 2, patronymic: 3,
    rayon: 4, childId: 5, section: 6, grade: 7,
    schoolName: 8, utisCode: 9, gender: 10, note: 11,
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [seatingType, setSeatingType] = useState<SeatingType>('A');
  const [useGenderBalance, setUseGenderBalance] = useState(false);

  const [centerConfigs, setCenterConfigs] = useState<Record<string, RoomConfig[]>>({});
  const [activeCenter, setActiveCenter] = useState<string>('');

  const [results, setResults] = useState<CenterResult[]>([]);
  const [swapStack, setSwapStack] = useState<CenterResult[][]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [centerFilter, setCenterFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<{ centerIdx: number; roomIdx: number; seatIdx: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Dialog states
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');

  // ── Persistence — load once on mount ───────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('exam_seating_state');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.students)      setStudents(p.students);
        if (p.centerConfigs) setCenterConfigs(p.centerConfigs);
        if (p.results)       setResults(migrateResults(p.results));
        if (p.currentStep)   setCurrentStep(p.currentStep);
      }
    } catch { /* ignore corrupted data */ }

    try {
      const savedHistory = localStorage.getItem('exam_seating_history');
      if (savedHistory) {
        const parsed: HistoryEntry[] = JSON.parse(savedHistory);
        setHistory(parsed.map(h => ({
          ...h,
          studentCount: h.studentCount ?? h.students?.length ?? 0,
          centerCount:  h.centerCount  ?? Object.keys(h.centerConfigs ?? {}).length,
        })));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem('exam_seating_state', JSON.stringify({ students, centerConfigs, results, currentStep }));
  }, [students, centerConfigs, results, currentStep]);

  useEffect(() => {
    localStorage.setItem('exam_seating_history', JSON.stringify(history));
  }, [history]);

  // ── History ────────────────────────────────────────────────────────────────
  const commitSaveToHistory = () => {
    const name = saveName.trim() || `Plan ${new Date().toLocaleDateString()}`;
    setHistory(prev => [{
      id: Date.now(),
      name,
      date: new Date().toISOString(),
      studentCount: students.length,
      centerCount: Object.keys(centerConfigs).length,
      students,
      centerConfigs,
      results,
    }, ...prev]);
    setShowSaveDialog(false);
    setSaveName('');
    toast({ title: 'Yadda saxlanıldı', description: 'Plan tarixçəyə əlavə edildi.' });
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setStudents(entry.students);
    setCenterConfigs(entry.centerConfigs);
    setResults(entry.results);
    setSwapStack([]);
    setCurrentStep('results');
    toast({ title: 'Yükləndi', description: entry.name });
  };

  const deleteFromHistory = (id: number) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  // ── Seat swap ─────────────────────────────────────────────────────────────
  const handleSeatClick = (centerIdx: number, roomIdx: number, seatIdx: number) => {
    if (!selectedSeat) {
      // First click — only select if there's a student (no point selecting a BOŞ seat first)
      const seat = results[centerIdx]?.rooms[roomIdx]?.seats[seatIdx];
      if (!seat?.student) return;
      setSelectedSeat({ centerIdx, roomIdx, seatIdx });
      return;
    }

    // Second click — perform swap
    const s1seat = results[selectedSeat.centerIdx]?.rooms[selectedSeat.roomIdx]?.seats[selectedSeat.seatIdx];
    const s2seat = results[centerIdx]?.rooms[roomIdx]?.seats[seatIdx];

    // Clicking the same seat or both BOŞ → cancel selection
    if (
      (selectedSeat.centerIdx === centerIdx && selectedSeat.roomIdx === roomIdx && selectedSeat.seatIdx === seatIdx) ||
      (!s1seat?.student && !s2seat?.student)
    ) {
      setSelectedSeat(null);
      return;
    }

    const newResults: CenterResult[] = JSON.parse(JSON.stringify(results));
    const s1 = newResults[selectedSeat.centerIdx].rooms[selectedSeat.roomIdx].seats[selectedSeat.seatIdx];
    const s2 = newResults[centerIdx].rooms[roomIdx].seats[seatIdx];

    const tmp = s1.student;
    s1.student = s2.student;
    s2.student = tmp;
    // Keep type in sync
    s1.type = s1.student ? 'CÜT' : 'BOŞ';
    s2.type = s2.student ? 'CÜT' : 'BOŞ';

    newResults[selectedSeat.centerIdx].rooms[selectedSeat.roomIdx].stats = calcStats(
      newResults[selectedSeat.centerIdx].rooms[selectedSeat.roomIdx].seats,
      newResults[selectedSeat.centerIdx].rooms[selectedSeat.roomIdx].config,
    );
    if (selectedSeat.centerIdx !== centerIdx || selectedSeat.roomIdx !== roomIdx) {
      newResults[centerIdx].rooms[roomIdx].stats = calcStats(
        newResults[centerIdx].rooms[roomIdx].seats,
        newResults[centerIdx].rooms[roomIdx].config,
      );
    }

    setSwapStack(prev => [...prev.slice(-9), results]);
    setResults(newResults);
    setSelectedSeat(null);
    toast({ title: 'Yer dəyişdirildi' });
  };

  const undoSwap = () => {
    if (!swapStack.length) return;
    setResults(swapStack[swapStack.length - 1]);
    setSwapStack(prev => prev.slice(0, -1));
    setSelectedSeat(null);
    toast({ title: 'Geri alındı' });
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetAll = () => {
    localStorage.removeItem('exam_seating_state');
    setStudents([]);
    setCenterConfigs({});
    setResults([]);
    setSwapStack([]);
    setRawRows([]);
    setCurrentStep('upload');
    setShowResetDialog(false);
  };

  // ── File handling ──────────────────────────────────────────────────────────
  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb   = XLSX.read(data, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      // raw: false → bütün cell-lər string kimi qaytarılır ([object Object] problemi yox)
      const json = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as string[][];

      if (json.length < 2) {
        toast({ title: 'Xəta', description: 'Fayl boşdur və ya başlıq yoxdur.', variant: 'destructive' });
        return;
      }
      setRawRows(json);
      setColumnMapping(autoDetectMapping(json[0]));
      setCurrentStep('mapping');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // ── Column mapping → students ──────────────────────────────────────────────
  const applyMapping = () => {
    const cell = (row: string[], col: number) => row[col] ?? '';
    const parsed: Student[] = rawRows.slice(1).map((row, idx) => {
      const genderRaw = cell(row, columnMapping.gender).toUpperCase();
      return {
        id:         `s-${idx}`,
        center:     cell(row, columnMapping.center)     || 'Naməlum',
        utisCode:   cell(row, columnMapping.utisCode)   || 'Naməlum',
        firstName:  cell(row, columnMapping.firstName),
        lastName:   cell(row, columnMapping.lastName),
        patronymic: cell(row, columnMapping.patronymic) || undefined,
        rayon:      cell(row, columnMapping.rayon)      || undefined,
        childId:    cell(row, columnMapping.childId)    || undefined,
        grade:      cell(row, columnMapping.grade),
        schoolName: cell(row, columnMapping.schoolName),
        section:    cell(row, columnMapping.section),
        gender:     (genderRaw.startsWith('Q') || genderRaw.startsWith('F')) ? 'Q' : 'K',
        note:       cell(row, columnMapping.note),
      };
    }).filter(s => s.firstName || s.lastName);

    setStudents(parsed);

    const centers = Array.from(new Set(parsed.map(s => s.center)));
    const initConfigs: Record<string, RoomConfig[]> = {};
    centers.forEach(c => {
      initConfigs[c] = [{ id: `${Date.now()}-${Math.random()}`, name: 'Otaq 1', columns: 3, rowsPerColumn: 4 }];
    });
    setCenterConfigs(initConfigs);
    if (centers.length) setActiveCenter(centers[0]);

    setCurrentStep('review');
    toast({ title: 'Mapping tətbiq edildi', description: `${parsed.length} şagird · ${centers.length} mərkəz.` });
  };

  // ── Student management ─────────────────────────────────────────────────────
  const shuffleStudents = () => {
    setStudents(prev => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
    toast({ title: 'Siyahı qarışdırıldı' });
  };

  const updateStudent = (id: string, field: keyof Student, value: string) =>
    setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));

  const deleteStudent = (id: string) =>
    setStudents(prev => prev.filter(s => s.id !== id));

  // ── Room config ────────────────────────────────────────────────────────────
  const addRoomConfig = (cName: string) =>
    setCenterConfigs(prev => ({
      ...prev,
      [cName]: [...(prev[cName] ?? []), {
        id: `${Date.now()}-${Math.random()}`,
        name: `Otaq ${(prev[cName]?.length ?? 0) + 1}`,
        columns: 3, rowsPerColumn: 4, totalDesks: 12, proctors: '',
      }],
    }));

  const updateRoomConfig = (
    cName: string, roomId: string,
    field: keyof RoomConfig, value: string | number,
  ) =>
    setCenterConfigs(prev => ({
      ...prev,
      [cName]: prev[cName].map(r => r.id === roomId ? { ...r, [field]: value } : r),
    }));

  const removeRoomConfig = (cName: string, roomId: string) =>
    setCenterConfigs(prev => ({
      ...prev,
      [cName]: prev[cName].length > 1 ? prev[cName].filter(r => r.id !== roomId) : prev[cName],
    }));

  const autoGenerateRoomsForAll = () => {
    const newConfigs: Record<string, RoomConfig[]> = {};
    Array.from(new Set(students.map(s => s.center))).forEach(cName => {
      const count   = students.filter(s => s.center === cName).length;
      const needed  = Math.ceil(count / (3 * 4 * 2));
      newConfigs[cName] = Array.from({ length: needed }, (_, i) => ({
        id: `auto-${Date.now()}-${cName}-${i}`,
        name: `Otaq ${i + 1}`, columns: 3, rowsPerColumn: 4, totalDesks: 12,
      }));
    });
    setCenterConfigs(newConfigs);
    toast({ title: 'Avto-Yarat tamamlandı' });
  };

  // ── Plan generation ────────────────────────────────────────────────────────

  const placeStudentsInRoom = (
    pool: Student[],
    config: RoomConfig,
    type: SeatingType,
    genderBalance: boolean,
  ): Seat[] => {
    const seats: Seat[] = [];
    const deskCount  = config.totalDesks ?? (config.columns * config.rowsPerColumn);
    const rowsPerCol = config.rowsPerColumn || Math.ceil(deskCount / config.columns);

    const occupantAt = (d: number, p: 'Sol' | 'Sağ') =>
      seats.find(s => s.deskNumber === d && s.position === p)?.student;

    const gradeW   = type === 'B' ? 3 : 1;
    const sectionW = type === 'B' ? 2 : 0;

    for (let d = 1; d <= deskCount; d++) {
      (['Sol', 'Sağ'] as const).forEach(pos => {
        // Always create the seat entry — BOŞ seats need a valid index for swapping
        let student: Student | undefined;

        if (pool.length > 0) {
          const neighbors = [
            occupantAt(d, pos === 'Sol' ? 'Sağ' : 'Sol'),
            occupantAt(d - 1, pos),
            occupantAt(d + 1, pos),
            occupantAt(d - rowsPerCol, pos),
            occupantAt(d + rowsPerCol, pos),
            occupantAt(d - rowsPerCol - 1, pos),
            occupantAt(d - rowsPerCol + 1, pos),
          ].filter((n): n is Student => !!n);

          const targetGender = genderBalance ? (seats.length % 2 === 0 ? 'K' : 'Q') : null;

          let bestIdx = 0;
          let minConflicts = Infinity;

          for (let pi = 0; pi < Math.min(pool.length, 50); pi++) {
            const c = pool[pi];
            let conflicts = 0;
            neighbors.forEach(n => {
              if (n.utisCode === c.utisCode) conflicts += 10;
              if (n.grade   === c.grade)    conflicts += gradeW;
              if (sectionW  && n.section === c.section) conflicts += sectionW;
            });
            if (targetGender && c.gender !== targetGender) conflicts += 5;
            if (conflicts < minConflicts) {
              minConflicts = conflicts;
              bestIdx = pi;
              if (conflicts === 0) break;
            }
          }

          student = pool.splice(bestIdx, 1)[0];
        }

        seats.push({ seatNumber: seats.length + 1, deskNumber: d, position: pos, type: student ? 'CÜT' : 'BOŞ', student });
      });
    }
    return seats;
  };

  const buildPool = (centerStudents: Student[], type: SeatingType): Student[] => {
    const shuffled = [...centerStudents].sort(() => Math.random() - 0.5);
    if (type !== 'C') return shuffled;
    return [
      ...shuffled.filter(s => s.section === 'Az'),
      ...shuffled.filter(s => s.section === 'Rus'),
      ...shuffled.filter(s => s.section !== 'Az' && s.section !== 'Rus'),
    ];
  };

  const generatePlan = () => {
    const centerMap: Record<string, Student[]> = {};
    students.forEach(s => {
      if (!centerMap[s.center]) centerMap[s.center] = [];
      centerMap[s.center].push(s);
    });

    const finalResults: CenterResult[] = Object.entries(centerMap).map(([centerName, centerStudents]) => {
      const rooms = centerConfigs[centerName] ?? [];
      const pool  = buildPool(centerStudents, seatingType);
      const roomResults: RoomResult[] = [];

      for (const config of rooms) {
        if (!pool.length) break;
        const seats = placeStudentsInRoom(pool, config, seatingType, useGenderBalance);
        roomResults.push({ config, seats, stats: calcStats(seats, config) });
      }

      if (pool.length > 0) {
        toast({
          title: 'Diqqət',
          description: `${centerName}: ${pool.length} şagird yerləşdirilə bilmədi!`,
          variant: 'destructive',
        });
      }
      return { centerName, rooms: roomResults };
    });

    setResults(finalResults);
    setSwapStack([]);
    setCurrentStep('results');
    toast({ title: 'Plan hazırlandı' });
  };

  const regenerateRoom = (centerIdx: number, roomIdx: number) => {
    const newResults: CenterResult[] = JSON.parse(JSON.stringify(results));
    const room = newResults[centerIdx].rooms[roomIdx];
    const pool = room.seats
      .filter(s => s.student)
      .map(s => s.student as Student)
      .sort(() => Math.random() - 0.5);

    const seats = placeStudentsInRoom(pool, room.config, seatingType, useGenderBalance);
    newResults[centerIdx].rooms[roomIdx].seats = seats;
    newResults[centerIdx].rooms[roomIdx].stats = calcStats(seats, room.config);

    setSwapStack(prev => [...prev.slice(-9), results]);
    setResults(newResults);
    toast({ title: `${room.config.name} yeniləndi` });
  };

  // ── Stats calculation ──────────────────────────────────────────────────────
  const calcStats = (seats: Seat[], config: RoomConfig): RoomStats => {
    let totalStudents = 0, usedSeats = 0, emptySeats = 0;
    let singleCount = 0, doubleCount = 0, utisViolations = 0;
    const deskGroups: Record<number, Seat[]> = {};

    seats.forEach(s => {
      (deskGroups[s.deskNumber] ??= []).push(s);
      if (s.student) { totalStudents++; usedSeats++; } else { emptySeats++; }
    });

    Object.values(deskGroups).forEach(group => {
      const occ = group.filter(s => s.student);
      if (occ.length === 2) {
        doubleCount += 2;
        if (occ[0].student?.utisCode === occ[1].student?.utisCode) utisViolations++;
      } else if (occ.length === 1) singleCount++;
    });

    const at = (d: number, p: 'Sol' | 'Sağ') =>
      seats.find(s => s.deskNumber === d && s.position === p)?.student;

    let riskWeight = 0;
    seats.forEach(({ student: st, deskNumber: d, position: pos }) => {
      if (!st) return;
      const utis = st.utisCode;
      const partner = at(d, pos === 'Sol' ? 'Sağ' : 'Sol');
      if (partner?.utisCode === utis) riskWeight += 1.0;
      if (at(d - 1, pos)?.utisCode === utis) riskWeight += 0.5;
      if (at(d + 1, pos)?.utisCode === utis) riskWeight += 0.5;
      const other = pos === 'Sol' ? 'Sağ' : 'Sol';
      if (at(d - 1, other)?.utisCode === utis) riskWeight += 0.25;
      if (at(d + 1, other)?.utisCode === utis) riskWeight += 0.25;
    });

    const riskScore = totalStudents > 0
      ? Math.min(Math.round((riskWeight / totalStudents) * 100), 100)
      : 0;
    const riskStatus: RoomStats['riskStatus'] =
      riskScore < 15 ? 'Təhlükəsiz' : riskScore < 40 ? 'Orta Risk' : 'Yüksək Risk';

    void config; // config available for future capacity-based risk calc
    return { totalStudents, usedSeats, emptySeats, singleCount, doubleCount, utisViolations, riskScore, riskStatus };
  };

  // ── Template download ──────────────────────────────────────────────────────
  const downloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Şablon');

    // Sütun genişlikləri
    ws.columns = [
      { key: 'center',     width: 20 },
      { key: 'lastName',   width: 16 },
      { key: 'firstName',  width: 16 },
      { key: 'patronymic', width: 16 },
      { key: 'rayon',      width: 14 },
      { key: 'childId',    width: 14 },
      { key: 'section',    width: 14 },
      { key: 'grade',      width: 14 },
      { key: 'schoolName', width: 28 },
      { key: 'utisCode',   width: 18 },
      { key: 'gender',     width: 14 },
      { key: 'note',       width: 14 },
    ];

    // Başlıq sətri — sarı fon, qalın, mərkəzli
    const headers = [
      'İmtahan Mərkəzi', 'Soyadı', 'Adı', 'Atasının adı', 'Rayon',
      'Uşaq İD', 'Tədris dili (Az/Rus)', 'Tədris sinfi', 'Təhsil müəssisəsi',
      'Müəssisəsinin İD (UTİS)', 'Cinsiyyət (K/Q)', 'Qeyd',
    ];
    const headerRow = ws.addRow(headers);
    headerRow.eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FF000000' } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border    = {
        top:    { style: 'medium' }, bottom: { style: 'medium' },
        left:   { style: 'medium' }, right:  { style: 'medium' },
      };
    });
    headerRow.height = 36;

    // Nümunə sətrlər
    const samples = [
      ['Mərkəz 1', 'Məmmədov', 'Vüsal',  'Ramiz',  'Binəqədi', '78901', 'Az',  '11A', 'Məktəb №1', '123456', 'K', ''],
      ['Mərkəz 1', 'Həsənova', 'Günay',  'Əli',    'Sabunçu',  '78902', 'Rus', '11B', 'Məktəb №2', '789012', 'Q', ''],
      ['Mərkəz 2', 'Əliyev',   'Murad',  'Tural',  'Nizami',   '78903', 'Az',  '11A', 'Məktəb №3', '345678', 'K', ''],
    ];
    samples.forEach(row => {
      const dataRow = ws.addRow(row);
      dataRow.eachCell(cell => {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border    = {
          top:    { style: 'thin' }, bottom: { style: 'thin' },
          left:   { style: 'thin' }, right:  { style: 'thin' },
        };
      });
      dataRow.height = 20;
    });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), 'Imtahan_Sablon.xlsx');
    toast({ title: 'Şablon yükləndi' });
  };

  // ── Print helpers (XSS-safe) ───────────────────────────────────────────────
  const buildCard = (s: Seat, centerName: string, roomName: string) => `
    <div class="card">
      <div class="header">BURAXILIŞ VƏRƏQƏSİ</div>
      <div class="row"><div class="label">Şagird:</div><b>${escapeHtml(s.student?.firstName ?? '')} ${escapeHtml(s.student?.lastName ?? '')}</b></div>
      <div class="row"><div class="label">Məktəb:</div>${escapeHtml(s.student?.schoolName ?? '')}</div>
      <div class="row"><div class="label">Mərkəz / Otaq:</div><b>${escapeHtml(centerName)} / ${escapeHtml(roomName)}</b></div>
      <div class="row"><div class="label">Oturacaq №:</div><b style="font-size:20px">${s.seatNumber}</b></div>
      <div class="utis-badge">UTİS: ${escapeHtml(s.student?.utisCode ?? '')}</div>
    </div>
  `;

  const openPrintWindow = (body: string, head = '') => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head>${head}</head><body onload="window.print()">${body}</body></html>`);
    win.document.close();
  };

  const handlePrintCards = (centerName: string, room: RoomResult) =>
    openPrintWindow(
      room.seats.filter(s => s.student).map(s => buildCard(s, centerName, room.config.name)).join(''),
      `<style>${PRINT_CARD_CSS}</style>`,
    );

  const handlePrintAllCards = () =>
    openPrintWindow(
      results.flatMap(c => c.rooms.flatMap(r =>
        r.seats.filter(s => s.student).map(s => buildCard(s, c.centerName, r.config.name))
      )).join(''),
      `<style>${PRINT_CARD_CSS}</style>`,
    );

  const handlePrint = (room: RoomResult, centerName: string) => {
    const rows = room.seats.map(s => `
      <tr>
        <td>${s.seatNumber}</td><td>${s.deskNumber}</td><td>${escapeHtml(s.position)}</td>
        <td>${s.student ? escapeHtml(`${s.student.firstName} ${s.student.lastName}`) : 'BOŞ'}</td>
        <td>${escapeHtml(s.student?.grade ?? '-')}</td>
        <td>${escapeHtml(s.student?.schoolName ?? '-')}</td>
        <td>${escapeHtml(s.student?.utisCode ?? '-')}</td>
      </tr>`).join('');
    openPrintWindow(
      `<h1>${escapeHtml(centerName)} — ${escapeHtml(room.config.name)}</h1>
       <table><thead><tr><th>№</th><th>Parta</th><th>Mövqe</th><th>Ad Soyad</th><th>Sinif</th><th>Məktəb</th><th>UTİS</th></tr></thead>
       <tbody>${rows}</tbody></table>`,
      `<style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px}th{background:#f2f2f2}</style>`,
    );
  };

  const buildProtocol = (centerName: string, room: RoomResult) => {
    const rows = room.seats.filter(s => s.student).map(s => `
      <tr>
        <td style="border:1px solid #000;padding:5px;text-align:center">${s.seatNumber}</td>
        <td style="border:1px solid #000;padding:5px;text-align:center">${s.deskNumber}-${escapeHtml(s.position)}</td>
        <td style="border:1px solid #000;padding:5px">${escapeHtml(s.student?.firstName ?? '')} ${escapeHtml(s.student?.lastName ?? '')}</td>
        <td style="border:1px solid #000;padding:5px"></td>
        <td style="border:1px solid #000;padding:5px"></td>
      </tr>`).join('');
    return `
      <div style="page-break-after:always;font-family:sans-serif;padding:30px">
        <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:20px">
          <h2 style="margin:0">İMTİHAN OTAQ PROTOKOLU</h2>
        </div>
        <div style="border:1px solid #000;padding:10px;margin:10px 0">
          <b>Mərkəz:</b> ${escapeHtml(centerName)} | <b>Otaq:</b> ${escapeHtml(room.config.name)} | <b>Tarix:</b> ${new Date().toLocaleDateString()}
        </div>
        <div style="border:1px solid #000;padding:10px;margin:10px 0">
          <b>Nəzarətçilər:</b> ${escapeHtml(room.config.proctors ?? 'Təyin edilməyib')}
        </div>
        <p><b>Şagird Siyahısı:</b></p>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="border:1px solid #000;padding:5px">№</th>
            <th style="border:1px solid #000;padding:5px">Yer</th>
            <th style="border:1px solid #000;padding:5px">Ad Soyad</th>
            <th style="border:1px solid #000;padding:5px">İmza</th>
            <th style="border:1px solid #000;padding:5px">Qeyd</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:50px">
          <p>Nəzarətçi imzası: ___________________</p>
          <p>Mərkəz rəhbəri imzası: ___________________</p>
        </div>
      </div>`;
  };

  const handlePrintProtocol = (centerName: string, room: RoomResult) =>
    openPrintWindow(buildProtocol(centerName, room));

  const handlePrintAllProtocols = () =>
    openPrintWindow(results.flatMap(c => c.rooms.map(r => buildProtocol(c.centerName, r))).join(''));

  // ── Excel export ───────────────────────────────────────────────────────────
  const exportToExcel = async () => {
    const wb = new ExcelJS.Workbook();

    // ── XÜLASƏ sheet ──────────────────────────────────────────────────────────
    const summary = wb.addWorksheet('XÜLASƏ');
    summary.columns = [
      { header: 'Mərkəz',         key: 'center',   width: 25 },
      { header: 'Otaq',           key: 'room',     width: 20 },
      { header: 'Şagird sayı',    key: 'students', width: 14 },
      { header: 'UTİS Pozulması', key: 'utis',     width: 16 },
      { header: 'Risk',           key: 'risk',     width: 20 },
    ];
    const summaryHeader = summary.getRow(1);
    summaryHeader.font = { bold: true };
    summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } };
    summaryHeader.eachCell(c => {
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    results.forEach(center => {
      center.rooms.forEach(room => {
        summary.addRow({
          center:   center.centerName,
          room:     room.config.name,
          students: room.stats.totalStudents,
          utis:     room.stats.utisViolations,
          risk:     `${room.stats.riskScore}% (${room.stats.riskStatus})`,
        });
      });
    });

    // ── Hər mərkəz üçün sheet — rəsmi format ──────────────────────────────────
    const EXPORT_COLS = [
      { header: 'NO',                        width: 6  },
      { header: 'Soyadı',                    width: 16 },
      { header: 'Adı',                       width: 16 },
      { header: 'Atasının adı',              width: 16 },
      { header: 'Rayon',                     width: 14 },
      { header: 'Sual kitabçasının variant', width: 22 },
      { header: 'Tədris dili',               width: 13 },
      { header: 'Tədris sinfi',              width: 13 },
      { header: 'Təhsil müəssisəsi',         width: 28 },
      { header: 'Müəssisəsinin İD',          width: 16 },
      { header: 'Uşaq İD',                  width: 14 },
      { header: 'Yer',                       width: 8  },
      { header: 'Otaq',                      width: 14 },
      { header: 'Mərkəz',                    width: 20 },
    ];

    const applyHeaderStyle = (row: ExcelJS.Row) => {
      row.height = 36;
      row.eachCell(cell => {
        cell.font      = { bold: true, color: { argb: 'FF000000' } };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border    = {
          top: { style: 'medium' }, bottom: { style: 'medium' },
          left: { style: 'medium' }, right: { style: 'medium' },
        };
      });
    };

    const applyDataStyle = (row: ExcelJS.Row) => {
      row.height = 18;
      row.eachCell(cell => {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border    = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' },
        };
      });
    };

    results.forEach(center => {
      const sheetName = center.centerName.substring(0, 31).replace(/[\\/*?:[\]]/g, '_');
      const sheet = wb.addWorksheet(sheetName);
      sheet.columns = EXPORT_COLS.map(c => ({ header: c.header, width: c.width }));

      // Başlıq
      const headerRow = sheet.getRow(1);
      headerRow.values = EXPORT_COLS.map(c => c.header);
      applyHeaderStyle(headerRow);

      // Şagird sətirləri — yalnız şagirdli oturacaqlar, otaq sırası ilə
      let rowNo = 1;
      center.rooms.forEach(room => {
        room.seats
          .filter(s => s.student)
          .forEach(s => {
            const st = s.student!;
            const dataRow = sheet.addRow([
              rowNo++,
              st.lastName,
              st.firstName,
              st.patronymic ?? '',
              st.rayon      ?? '',
              '',                    // Sual kitabçasının variant — boş
              st.section,
              st.grade,
              st.schoolName,
              st.utisCode,
              st.childId    ?? '',
              s.seatNumber,
              room.config.name,
              center.centerName,
            ]);
            applyDataStyle(dataRow);
          });
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), 'Imtahan_Oturma_Plani.xlsx');
    toast({ title: 'Excel hazırlandı' });
  };

  // ── Computed ───────────────────────────────────────────────────────────────
  const uniqueCenters = useMemo(() => Array.from(new Set(students.map(s => s.center))), [students]);

  const filteredStudents = useMemo(() => {
    let list = [...students];
    if (centerFilter !== 'all') list = list.filter(s => s.center === centerFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.schoolName.toLowerCase().includes(q) ||
        s.utisCode.includes(q),
      );
    }
    if (sortField) {
      list.sort((a, b) => {
        const cmp = (a[sortField] ?? '').localeCompare(b[sortField] ?? '', 'az');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [students, searchQuery, centerFilter, sortField, sortDir]);

  const centerCapacity = useMemo(() => {
    const res: Record<string, { students: number; capacity: number }> = {};
    Object.entries(centerConfigs).forEach(([name, rooms]) => {
      res[name] = {
        students: students.filter(s => s.center === name).length,
        capacity: rooms.reduce((sum, r) => sum + (r.totalDesks ?? (r.columns * r.rowsPerColumn)) * 2, 0),
      };
    });
    return res;
  }, [centerConfigs, students]);

  const globalStats = useMemo(() => {
    if (!results.length) return null;
    const totalStudents  = results.reduce((s, c) => s + c.rooms.reduce((a, r) => a + r.stats.totalStudents, 0), 0);
    const totalRooms     = results.reduce((s, c) => s + c.rooms.length, 0);
    const totalViolations = results.reduce((s, c) => s + c.rooms.reduce((a, r) => a + r.stats.utisViolations, 0), 0);
    const avgRisk = totalRooms > 0
      ? Math.round(results.reduce((s, c) => s + c.rooms.reduce((a, r) => a + r.stats.riskScore, 0), 0) / totalRooms)
      : 0;
    return { totalStudents, totalRooms, totalViolations, avgRisk };
  }, [results]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const currentStepIdx = STEP_ORDER.indexOf(currentStep);

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-20">

      {/* ── Step header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-background/50 backdrop-blur-xl p-6 rounded-2xl border shadow-sm">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Professional Oturma Planı
          </h1>
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground">Mükəmməl imtahan təşkili üçün ağıllı alət</p>
            <Button variant="ghost" size="sm" onClick={() => setShowResetDialog(true)} className="text-red-500 h-7 text-[10px] hover:bg-red-50">
              <RefreshCw className="w-3 h-3 mr-1" /> Yeni Plan
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          {([
            { id: 'upload',  icon: Upload,       label: 'Yüklə'    },
            { id: 'mapping', icon: FileSpreadsheet, label: 'Xəritələ' },
            { id: 'review',  icon: Edit3,         label: 'Redaktə'  },
            { id: 'config',  icon: Settings2,     label: 'Tənzimlə' },
            { id: 'results', icon: CheckCircle2,  label: 'Nəticə'   },
          ] as { id: Step; icon: React.ElementType; label: string }[]).map((s, idx) => {
            const sIdx       = STEP_ORDER.indexOf(s.id);
            const isCompleted = sIdx < currentStepIdx;
            const isCurrent   = currentStep === s.id;
            return (
              <React.Fragment key={s.id}>
                <div
                  onClick={() => isCompleted && setCurrentStep(s.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300',
                    isCurrent   ? 'bg-primary text-primary-foreground shadow-lg scale-105' : 'bg-muted text-muted-foreground opacity-70',
                    isCompleted && 'cursor-pointer hover:opacity-100 hover:bg-muted/80',
                  )}
                >
                  <s.icon className="w-4 h-4" />
                  <span className="text-sm font-medium whitespace-nowrap">{s.label}</span>
                </div>
                {idx < 4 && <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ══════════════════ STEP: Upload ══════════════════ */}
        {currentStep === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8">

            <Card
              className={cn(
                'border-2 border-dashed flex flex-col items-center justify-center p-12 text-center space-y-6 transition-all cursor-pointer group relative overflow-hidden',
                isDragging ? 'border-primary bg-primary/10 scale-[1.01]' : 'hover:border-primary/50 hover:bg-primary/5',
              )}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
            >
              <div className={cn('p-6 bg-blue-100 rounded-full transition-transform', isDragging ? 'scale-125' : 'group-hover:scale-110')}>
                <Upload className="w-12 h-12 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{isDragging ? 'Faylı buraxın' : 'Faylı bura sürükləyin'}</h2>
                <p className="text-muted-foreground text-sm">XLSX, XLS və ya CSV formatında şagird siyahısı.</p>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".xlsx,.xls,.csv" />
              <Button size="lg" className="px-8 shadow-xl" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Fayl Seçin
              </Button>
            </Card>

            <Card className="p-8 space-y-6 bg-indigo-50/50 border-indigo-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 rounded-xl"><FileSpreadsheet className="w-8 h-8 text-indigo-600" /></div>
                <div>
                  <h3 className="text-xl font-bold">Hazır Şablon</h3>
                  <p className="text-muted-foreground text-sm">Vaxtınıza qənaət etmək üçün şablondan istifadə edin.</p>
                </div>
              </div>
              <Button variant="outline" size="lg" className="w-full bg-background border-indigo-200" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" /> Şablonu Yüklə
              </Button>
            </Card>

            {history.length > 0 && (
              <Card className="md:col-span-2 p-6 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-slate-500" />
                  <h3 className="font-bold">Yadda Saxlanılan Planlar</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {history.map(item => (
                    <div key={item.id} className="bg-white border rounded-xl p-4 flex justify-between items-center group hover:border-primary transition-all">
                      <div className="cursor-pointer overflow-hidden flex-1" onClick={() => loadFromHistory(item)}>
                        <p className="font-bold text-sm truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(item.date).toLocaleDateString()} · {item.studentCount} şagird · {item.centerCount} mərkəz
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteFromHistory(item.id)} className="text-red-400 opacity-0 group-hover:opacity-100 ml-2">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* ══════════════════ STEP: Mapping ══════════════════ */}
        {currentStep === 'mapping' && (
          <motion.div key="mapping" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sütunların Uyğunlaşdırılması</CardTitle>
                <p className="text-sm text-muted-foreground">Sütun adları avtomatik uyğunlaşdırıldı. Yoxlayın və lazım olsa düzəldin.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Object.keys(columnMapping).map(key => (
                    <div key={key} className="space-y-2">
                      <Label className="capitalize font-bold text-xs text-muted-foreground">{key}</Label>
                      <Select
                        value={columnMapping[key].toString()}
                        onValueChange={val => setColumnMapping(prev => ({ ...prev, [key]: parseInt(val) }))}
                      >
                        <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {rawRows[0]?.map((col, idx) => {
                            const colName = col || `Sütun ${idx + 1}`;
                            // preview: first 2 data rows — shown in dropdown only
                            const preview = [rawRows[1]?.[idx], rawRows[2]?.[idx]]
                              .filter((v): v is string => !!v)
                              .join(', ');
                            return (
                              // textValue → SelectValue trigger-də yalnız sütun adı göstərir
                              <SelectItem key={idx} value={idx.toString()} textValue={colName}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{colName}</span>
                                  {preview && (
                                    <span className="text-[10px] text-muted-foreground">{preview}</span>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="justify-between border-t p-6">
                <Button variant="ghost" onClick={() => setCurrentStep('upload')}><ArrowLeft className="w-4 h-4 mr-2" /> Geri</Button>
                <Button size="lg" onClick={applyMapping} className="px-12 shadow-lg">Davam Et <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {/* ══════════════════ STEP: Review ══════════════════ */}
        {currentStep === 'review' && (
          <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Şagird Siyahısı ({filteredStudents.length}/{students.length})
              </h2>
              <div className="flex gap-2 w-full md:w-auto flex-wrap">
                <div className="relative flex-1 md:w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Axtar..." className="pl-10 h-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <Select value={centerFilter} onValueChange={setCenterFilter}>
                  <SelectTrigger className="h-9 w-[170px]">
                    <Filter className="w-3 h-3 mr-1" /><SelectValue placeholder="Mərkəz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Bütün mərkəzlər</SelectItem>
                    {uniqueCenters.map(c => (
                      <SelectItem key={c} value={c}>{c} ({students.filter(s => s.center === c).length})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={shuffleStudents} className="text-indigo-600 border-indigo-100 hover:bg-indigo-50 h-9">
                  <Shuffle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Center chips */}
            <div className="flex gap-2 flex-wrap">
              {uniqueCenters.map(c => (
                <Badge
                  key={c} variant={centerFilter === c ? 'default' : 'outline'} className="cursor-pointer"
                  onClick={() => setCenterFilter(prev => prev === c ? 'all' : c)}
                >
                  {c}: {students.filter(s => s.center === c).length}
                </Badge>
              ))}
            </div>

            <Card className="overflow-hidden border-none shadow-xl">
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-md">
                    <TableRow>
                      {([
                        ['lastName',   'Soyad'],
                        ['firstName',  'Ad'],
                        ['grade',      'Sinif'],
                        ['schoolName', 'Məktəb'],
                        ['center',     'Mərkəz'],
                      ] as [SortField, string][]).map(([field, label]) => (
                        <TableHead key={field} className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
                          <span className="flex items-center gap-1">
                            {label}
                            {sortField === field && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                          </span>
                        </TableHead>
                      ))}
                      <TableHead>Atasının adı</TableHead>
                      <TableHead>Rayon</TableHead>
                      <TableHead>Uşaq İD</TableHead>
                      <TableHead>UTİS</TableHead>
                      <TableHead>Bölmə</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map(s => (
                      <TableRow key={s.id} className="hover:bg-primary/5 transition-colors group">
                        <TableCell><Input variant="ghost" className="h-8 py-0 px-2 font-medium" value={s.lastName}    onChange={e => updateStudent(s.id, 'lastName',    e.target.value)} /></TableCell>
                        <TableCell><Input variant="ghost" className="h-8 py-0 px-2 font-medium" value={s.firstName}   onChange={e => updateStudent(s.id, 'firstName',   e.target.value)} /></TableCell>
                        <TableCell><Input variant="ghost" className="h-8 py-0 px-2"             value={s.grade}       onChange={e => updateStudent(s.id, 'grade',       e.target.value)} /></TableCell>
                        <TableCell><Input variant="ghost" className="h-8 py-0 px-2 text-xs"     value={s.schoolName}  onChange={e => updateStudent(s.id, 'schoolName',  e.target.value)} /></TableCell>
                        <TableCell><Input variant="ghost" className="h-8 py-0 px-2 text-xs"     value={s.center}      onChange={e => updateStudent(s.id, 'center',      e.target.value)} /></TableCell>
                        <TableCell><Input variant="ghost" className="h-8 py-0 px-2 text-xs"     value={s.patronymic ?? ''} onChange={e => updateStudent(s.id, 'patronymic', e.target.value)} /></TableCell>
                        <TableCell><Input variant="ghost" className="h-8 py-0 px-2 text-xs"     value={s.rayon      ?? ''} onChange={e => updateStudent(s.id, 'rayon',      e.target.value)} /></TableCell>
                        <TableCell><Input variant="ghost" className="h-8 py-0 px-2 font-mono text-xs" value={s.childId ?? ''} onChange={e => updateStudent(s.id, 'childId',  e.target.value)} /></TableCell>
                        <TableCell><Input variant="ghost" className="h-8 py-0 px-2 font-mono text-xs" value={s.utisCode}    onChange={e => updateStudent(s.id, 'utisCode',   e.target.value)} /></TableCell>
                        <TableCell>
                          <Select value={s.section} onValueChange={val => updateStudent(s.id, 'section', val)}>
                            <SelectTrigger className="h-8 text-xs border-none bg-transparent hover:bg-muted"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Az">Az</SelectItem>
                              <SelectItem value="Rus">Rus</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => deleteStudent(s.id)} className="opacity-0 group-hover:opacity-100 text-red-400">
                            <X className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <div className="flex justify-between items-center bg-background/50 p-6 rounded-2xl border">
              <Button variant="ghost" onClick={() => setCurrentStep('mapping')}><ArrowLeft className="w-4 h-4 mr-2" /> Geri</Button>
              <Button size="lg" onClick={() => setCurrentStep('config')} className="px-12 shadow-lg">Davam Et <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </div>
          </motion.div>
        )}

        {/* ══════════════════ STEP: Config ══════════════════ */}
        {currentStep === 'config' && (
          <motion.div key="config" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-8">

            {/* Left panel — centers + options */}
            <Card className="lg:col-span-1 shadow-xl border-none bg-slate-50/50">
              <CardHeader>
                <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-slate-500">
                  <Building2 className="w-4 h-4" /> Mərkəzlər
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {Object.keys(centerConfigs).map(cName => {
                  const cap = centerCapacity[cName];
                  const shortfall = cap && cap.capacity < cap.students;
                  return (
                    <div
                      key={cName} onClick={() => setActiveCenter(cName)}
                      className={cn(
                        'p-4 rounded-2xl cursor-pointer transition-all border-2 mb-2',
                        activeCenter === cName ? 'bg-white border-primary shadow-md' : 'bg-transparent border-transparent hover:bg-white/50',
                        shortfall && 'border-red-200',
                      )}
                    >
                      <span className="font-bold text-sm truncate block">{cName}</span>
                      <div className={cn('flex items-center gap-1 text-[10px] mt-1', shortfall ? 'text-red-600 font-bold' : 'text-muted-foreground')}>
                        <Users className="w-3 h-3" />
                        {cap?.students ?? 0} şagird / {cap?.capacity ?? 0} yer
                      </div>
                      {shortfall && (
                        <p className="text-[9px] text-red-500 mt-1">⚠ {cap.students - cap.capacity} şagird sığmayacaq</p>
                      )}
                    </div>
                  );
                })}

                {/* Seating type + options */}
                <div className="pt-4 px-2 space-y-3">
                  <div className="bg-white rounded-xl border p-3 space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Yerləşdirmə Strategiyası</Label>
                    {SEATING_TYPES.map(({ type, label, desc }) => (
                      <div
                        key={type} onClick={() => setSeatingType(type)}
                        className={cn(
                          'p-2 rounded-lg cursor-pointer border transition-all',
                          seatingType === type ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0', seatingType === type ? 'border-primary' : 'border-muted-foreground')}>
                            {seatingType === type && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <span className="text-xs font-bold">{label}</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground ml-6 mt-0.5">{desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between p-2 bg-white rounded-xl border">
                    <Label className="text-[10px] font-bold uppercase">Cinsiyyət Balansı</Label>
                    <input type="checkbox" checked={useGenderBalance} onChange={e => setUseGenderBalance(e.target.checked)} className="w-4 h-4" />
                  </div>

                  <Button variant="ghost" size="sm" className="w-full text-indigo-600 font-bold hover:bg-indigo-50" onClick={autoGenerateRoomsForAll}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Hamısı üçün Avto-Yarat
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right panel — rooms */}
            <div className="lg:col-span-3 space-y-6">
              <div className="flex justify-between items-end">
                <h3 className="text-2xl font-black">
                  {activeCenter} <span className="text-slate-400 font-normal">otaqları</span>
                </h3>
                <Button size="sm" onClick={() => addRoomConfig(activeCenter)}>
                  <Plus className="w-4 h-4 mr-2" /> Otaq Əlavə Et
                </Button>
              </div>

              {/* Capacity alert */}
              {activeCenter && centerCapacity[activeCenter] && (() => {
                const { students: sc, capacity: cap } = centerCapacity[activeCenter];
                const diff = cap - sc;
                return (
                  <Alert className={diff < 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                    <AlertDescription className="text-sm">
                      {diff < 0
                        ? `⚠️ ${sc} şagird üçün yalnız ${cap} yer var — ${Math.abs(diff)} şagird sığmayacaq.`
                        : `✅ ${sc} şagird üçün ${cap} yer var — ${diff} yer boş qalacaq.`
                      }
                    </AlertDescription>
                  </Alert>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-auto pr-2 pb-4">
                {centerConfigs[activeCenter]?.map((config, idx) => (
                  <Card key={config.id} className="group hover:border-primary/50 transition-all shadow-sm">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="bg-slate-100 text-slate-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                        <Button variant="ghost" size="sm" onClick={() => removeRoomConfig(activeCenter, config.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <Label className="text-[10px] uppercase opacity-50 ml-1">Otaq Adı</Label>
                          <Input value={config.name} onChange={e => updateRoomConfig(activeCenter, config.id, 'name', e.target.value)} className="h-8 text-sm font-bold" />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase opacity-50 ml-1">Sıra Sayı</Label>
                          <Input type="number" value={config.columns} onChange={e => updateRoomConfig(activeCenter, config.id, 'columns', parseInt(e.target.value) || 1)} className="h-8" />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase opacity-50 ml-1 text-indigo-600 font-bold">Cəmi Parta</Label>
                          <Input type="number" value={config.totalDesks ?? (config.columns * config.rowsPerColumn)} onChange={e => updateRoomConfig(activeCenter, config.id, 'totalDesks', parseInt(e.target.value) || 1)} className="h-8 border-indigo-200" />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px] uppercase opacity-50 ml-1">Nəzarətçilər (Vergüllə)</Label>
                          <Input placeholder="Əli Vəliyev, Həsən Həsənov" value={config.proctors ?? ''} onChange={e => updateRoomConfig(activeCenter, config.id, 'proctors', e.target.value)} className="h-8 text-xs" />
                        </div>
                      </div>
                      <Badge className="w-full justify-center bg-slate-900 hover:bg-slate-900 py-1">
                        {(config.totalDesks ?? (config.columns * config.rowsPerColumn)) * 2} Şagird Yeri
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-between items-center pt-8 border-t">
                <Button variant="ghost" onClick={() => setCurrentStep('review')}><ArrowLeft className="w-4 h-4 mr-2" /> Geri</Button>
                <Button size="lg" onClick={generatePlan} className="px-12 bg-gradient-to-r from-primary to-indigo-600 shadow-xl font-bold">
                  <Shuffle className="w-4 h-4 mr-2" /> Planı Tamamla
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════ STEP: Results ══════════════════ */}
        {currentStep === 'results' && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

            {/* Sticky toolbar */}
            <div className="sticky top-0 z-20 flex flex-col md:flex-row justify-between items-center gap-4 bg-background/95 backdrop-blur-md p-6 rounded-2xl border shadow-lg">
              <h2 className="text-2xl font-bold">Nəticə</h2>
              <div className="flex gap-2 flex-wrap justify-end">
                <Tabs value={viewMode} onValueChange={val => setViewMode(val as 'list' | 'grid')}>
                  <TabsList className="bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="grid"><LayoutGrid className="w-4 h-4 mr-2" />Plan</TabsTrigger>
                    <TabsTrigger value="list"><List className="w-4 h-4 mr-2" />Siyahı</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button variant="outline" onClick={() => setCurrentStep('config')}><ArrowLeft className="w-4 h-4 mr-2" /> Ayarlara Qayıt</Button>
                <Button variant="outline" onClick={() => { setSaveName(`Plan ${new Date().toLocaleDateString()}`); setShowSaveDialog(true); }} className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Yadda Saxla
                </Button>
                <div className="flex gap-1">
                  {selectedSeat && (
                    <Button variant="destructive" size="sm" onClick={() => setSelectedSeat(null)} className="animate-pulse">Seçimi Ləğv Et</Button>
                  )}
                  {swapStack.length > 0 && (
                    <Button variant="outline" size="sm" onClick={undoSwap}><Undo2 className="w-3 h-3 mr-1" />Geri Al ({swapStack.length})</Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={handlePrintAllCards} className="bg-blue-50 text-blue-700 hover:bg-blue-100"><Printer className="w-3 h-3 mr-1" />Vərəqlər</Button>
                  <Button variant="secondary" size="sm" onClick={handlePrintAllProtocols} className="bg-amber-50 text-amber-700 hover:bg-amber-100"><FileSpreadsheet className="w-3 h-3 mr-1" />Protokollar</Button>
                </div>
                <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700"><Download className="w-4 h-4 mr-2" />Excel İxrac</Button>
              </div>
            </div>

            {/* Global stats */}
            {globalStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Cəmi Şagird',    value: globalStats.totalStudents,   color: 'text-blue-600' },
                  { label: 'Cəmi Otaq',       value: globalStats.totalRooms,      color: 'text-indigo-600' },
                  { label: 'UTİS Pozulması',  value: globalStats.totalViolations, color: globalStats.totalViolations > 0 ? 'text-red-600' : 'text-green-600' },
                  { label: 'Ortalama Risk',   value: `${globalStats.avgRisk}%`,   color: globalStats.avgRisk < 15 ? 'text-green-600' : globalStats.avgRisk < 40 ? 'text-amber-600' : 'text-red-600' },
                ].map(stat => (
                  <Card key={stat.label} className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className={cn('text-2xl font-black mt-1', stat.color)}>{stat.value}</p>
                  </Card>
                ))}
              </div>
            )}

            {results.map((center, centerIdx) => (
              <div key={centerIdx} className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-2 bg-primary rounded-full" />
                  <h3 className="text-2xl font-black">{center.centerName}</h3>
                </div>

                {/* Risk dashboard */}
                <Card className="bg-slate-900 text-white p-6 rounded-3xl overflow-hidden relative shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-32 -mt-32" />
                  <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                    <div className="space-y-2">
                      <h4 className="text-slate-400 text-xs font-black uppercase tracking-widest">Təhlükəsizlik Monitoru</h4>
                      <p className="text-2xl font-bold">Mərkəz üzrə Risk Analizi</p>
                    </div>
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {center.rooms.map((room, rIdx) => (
                        <div key={rIdx} className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                          <p className="text-[10px] text-slate-400 truncate">{room.config.name}</p>
                          <div className="flex items-end gap-2">
                            <span className={cn('text-xl font-black', room.stats.riskStatus === 'Təhlükəsiz' ? 'text-green-400' : room.stats.riskStatus === 'Orta Risk' ? 'text-amber-400' : 'text-red-500')}>
                              {room.stats.riskScore}%
                            </span>
                            <Badge variant="outline" className="text-[8px] h-4 border-white/20 text-white">{room.stats.riskStatus}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {center.rooms.map((room, roomIdx) => (
                  <Card key={roomIdx} className="overflow-hidden border-none shadow-2xl">
                    <CardHeader className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 p-6">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-4">
                          <CardTitle className="text-xl">{room.config.name}</CardTitle>
                          <Badge className={cn('text-white', room.stats.riskStatus === 'Təhlükəsiz' ? 'bg-green-500' : room.stats.riskStatus === 'Orta Risk' ? 'bg-amber-500' : 'bg-red-600')}>
                            Risk: {room.stats.riskScore}% ({room.stats.riskStatus})
                          </Badge>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="secondary">Şagird: {room.stats.totalStudents}</Badge>
                          <Button variant="outline" size="sm" onClick={() => regenerateRoom(centerIdx, roomIdx)}>
                            <RefreshCw className="w-4 h-4 mr-1" /> Yenilə
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handlePrintCards(center.centerName, room)}>
                            <Printer className="w-4 h-4 mr-1" /> Vərəqlər
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handlePrint(room, center.centerName)}>
                            <Printer className="w-4 h-4 mr-1" /> Çap
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handlePrintProtocol(center.centerName, room)}>
                            <FileSpreadsheet className="w-4 h-4 mr-1" /> Protokol
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6 bg-slate-50/50">
                      {viewMode === 'grid' ? (
                        <div
                          className="grid gap-x-12 gap-y-8 py-8 px-4 overflow-auto bg-white/50 rounded-3xl"
                          style={{ gridTemplateColumns: `repeat(${room.config.columns}, 1fr)`, minWidth: `${room.config.columns * 180}px` }}
                        >
                          {Array.from({ length: room.config.columns }).map((_, colIdx) => {
                            const totalDesks    = room.config.totalDesks ?? (room.config.columns * room.config.rowsPerColumn);
                            const basePerCol    = Math.floor(totalDesks / room.config.columns);
                            const extra         = totalDesks % room.config.columns;
                            const colDeskCount  = basePerCol + (colIdx < extra ? 1 : 0);
                            let startDesk = 1;
                            for (let i = 0; i < colIdx; i++) startDesk += basePerCol + (i < extra ? 1 : 0);

                            return (
                              <div key={colIdx} className="flex flex-col gap-8">
                                {Array.from({ length: colDeskCount }).map((_, deskRowIdx) => {
                                  const deskNum = startDesk + deskRowIdx;
                                  const sLIdx   = room.seats.findIndex(s => s.deskNumber === deskNum && s.position === 'Sol');
                                  const sRIdx   = room.seats.findIndex(s => s.deskNumber === deskNum && s.position === 'Sağ');
                                  const sL      = sLIdx >= 0 ? room.seats[sLIdx] : undefined;
                                  const sR      = sRIdx >= 0 ? room.seats[sRIdx] : undefined;

                                  // Uses outer centerIdx / roomIdx — not shadowed
                                  const isSelected = (idx: number) =>
                                    idx >= 0 &&
                                    selectedSeat?.centerIdx === centerIdx &&
                                    selectedSeat?.roomIdx   === roomIdx &&
                                    selectedSeat?.seatIdx   === idx;

                                  const sameSchool = sL?.student && sR?.student && sL.student.utisCode === sR.student.utisCode;
                                  // TƏK: student exists but partner slot is empty
                                  const lIsTek = sL?.student && !sR?.student;
                                  const rIsTek = sR?.student && !sL?.student;
                                  // Show drop-hint on BOŞ slot when a seat is selected
                                  const showDropHint = !!selectedSeat;

                                  return (
                                    <div key={deskRowIdx}>
                                      <div className={cn(
                                        'bg-background border shadow-md rounded-2xl p-2 h-[110px] flex flex-row gap-2 relative',
                                        sameSchool ? 'border-red-500' : 'border-slate-200',
                                      )}>
                                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-slate-800 text-white rounded-full flex items-center justify-center text-[9px] font-bold z-10">
                                          {deskNum}
                                        </div>

                                        {([
                                          { pos: 'Sol' as const, seat: sL, sIdx: sLIdx, isTek: lIsTek },
                                          { pos: 'Sağ' as const, seat: sR, sIdx: sRIdx, isTek: rIsTek },
                                        ]).map(({ pos, seat, sIdx, isTek }) => (
                                          <div
                                            key={pos}
                                            onClick={() => sIdx >= 0 && handleSeatClick(centerIdx, roomIdx, sIdx)}
                                            className={cn(
                                              'flex-1 p-2 rounded-xl border-t-4 flex flex-col justify-center transition-all relative',
                                              seat?.student
                                                ? cn(getGradeColor(seat.student.grade), 'cursor-pointer hover:scale-105')
                                                : cn(
                                                    'bg-slate-50 border-slate-200',
                                                    showDropHint && sIdx >= 0 ? 'cursor-pointer hover:bg-amber-50 hover:border-amber-300 border-dashed' : 'cursor-default opacity-50',
                                                  ),
                                              isSelected(sIdx) && 'ring-4 ring-primary ring-offset-2 scale-105 z-20',
                                            )}
                                          >
                                            <span className="text-[8px] font-bold opacity-40">{pos}</span>
                                            {seat?.student ? (
                                              <div className="mt-0.5">
                                                <p className="text-[9px] font-bold truncate">{seat.student.firstName} {seat.student.lastName}</p>
                                                <p className="text-[7px] opacity-80 truncate">{seat.student.schoolName}</p>
                                                {isTek && (
                                                  <span className="absolute top-1 right-1 text-[7px] bg-amber-400 text-white font-bold px-1 rounded">TƏK</span>
                                                )}
                                              </div>
                                            ) : (
                                              <p className={cn('text-[9px] font-bold uppercase', showDropHint && sIdx >= 0 ? 'text-amber-500' : 'text-slate-400')}>
                                                {showDropHint && sIdx >= 0 ? '+ buraya' : 'Boş'}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>№</TableHead><TableHead>Şagird</TableHead>
                              <TableHead>Sinif</TableHead><TableHead>UTİS</TableHead>
                              <TableHead>Parta</TableHead><TableHead>Mövqe</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {room.seats.map((s, idx) => (
                              <TableRow key={idx} className={s.student ? '' : 'opacity-40'}>
                                <TableCell>{s.seatNumber}</TableCell>
                                <TableCell>{s.student ? `${s.student.firstName} ${s.student.lastName}` : 'BOŞ'}</TableCell>
                                <TableCell>{s.student?.grade      ?? '-'}</TableCell>
                                <TableCell className="font-mono text-xs">{s.student?.utisCode ?? '-'}</TableCell>
                                <TableCell>{s.deskNumber}</TableCell>
                                <TableCell>{s.position}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Floating bar — review step */}
      {currentStep === 'review' && students.length > 0 && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-xl border shadow-2xl px-8 py-4 rounded-full flex items-center gap-8 z-50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold">{students.length} Şagird</span>
          </div>
          <Button size="sm" onClick={() => setCurrentStep('config')}>Davam Et</Button>
        </motion.div>
      )}

      {/* ── Dialogs ── */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Planı Sıfırla</AlertDialogTitle>
            <AlertDialogDescription>Bütün məlumatlar silinəcək. Bu əməliyyat geri alına bilməz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ləğv Et</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={resetAll}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Planı Yadda Saxla</DialogTitle></DialogHeader>
          <Input
            placeholder="Plan adı..."
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commitSaveToHistory()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Ləğv Et</Button>
            <Button onClick={commitSaveToHistory}>Saxla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ExamSeatingPlan;
