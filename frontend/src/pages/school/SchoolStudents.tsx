import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { studentService } from '@/services/students';
import { apiClient } from '@/services/api';
import type { RegionStudent, SchoolStudentFormData } from '@/services/students';
import { toast } from 'sonner';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus, Search, Edit2, Trash2, Users, GraduationCap, UserCheck, X,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SchoolGrade {
  id: number;
  name: string;
  class_level: number | string;
}

const GRADE_LEVELS = Array.from({ length: 12 }, (_, i) => String(i + 1));

const emptyForm = (): SchoolStudentFormData => ({
  utis_code:   '',
  first_name:  '',
  last_name:   '',
  grade_id:    undefined,
  grade_level: '',
  class_name:  '',
  gender:      undefined,
  birth_date:  '',
  parent_name: '',
  parent_phone:'',
  is_active:   true,
});

// ── SchoolStudents page ───────────────────────────────────────────────────────

export default function SchoolStudents() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  const institutionId = currentUser?.institution_id;

  // Filters
  const [search, setSearch]       = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [page, setPage]           = useState(1);

  // Dialogs
  const [formOpen, setFormOpen]     = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RegionStudent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RegionStudent | null>(null);
  const [form, setForm]             = useState<SchoolStudentFormData>(emptyForm());

  // ── Data queries ─────────────────────────────────────────────────────────

  const studentsQuery = useQuery({
    queryKey: ['school-students', institutionId, { search, gradeFilter, page }],
    queryFn: async () => {
      const res = await apiClient.get<any>('/school-students', {
        institution_id: institutionId,
        search:         search   || undefined,
        grade_level:    gradeFilter || undefined,
        page,
        per_page: 25,
      });
      return (res as any).data;
    },
    enabled: !!institutionId,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });

  const gradesQuery = useQuery({
    queryKey: ['school-grades', institutionId],
    queryFn: async () => {
      const res = await apiClient.get<any>('/grades', { institution_id: institutionId });
      const d = (res as any).data;
      return (d?.data ?? d ?? []) as SchoolGrade[];
    },
    enabled: !!institutionId,
    staleTime: 5 * 60_000,
  });

  const grades = gradesQuery.data ?? [];

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: SchoolStudentFormData) => studentService.createSimple(data),
    onSuccess: () => {
      toast.success('Şagird əlavə edildi');
      qc.invalidateQueries({ queryKey: ['school-students'] });
      closeForm();
    },
    onError: (e: Error) => toast.error(e.message || 'Xəta baş verdi'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SchoolStudentFormData }) =>
      studentService.updateSimple(id, data),
    onSuccess: () => {
      toast.success('Şagird yeniləndi');
      qc.invalidateQueries({ queryKey: ['school-students'] });
      closeForm();
    },
    onError: (e: Error) => toast.error(e.message || 'Xəta baş verdi'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => studentService.delete(id),
    onSuccess: () => {
      toast.success('Şagird silindi');
      qc.invalidateQueries({ queryKey: ['school-students'] });
      setDeleteOpen(false);
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Xəta baş verdi'),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setForm(emptyForm());
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((s: RegionStudent) => {
    setEditTarget(s);
    setForm({
      utis_code:    s.utis_code ?? '',
      first_name:   s.first_name,
      last_name:    s.last_name,
      grade_id:     s.grade?.id,
      grade_level:  s.grade_level,
      class_name:   s.class_name,
      gender:       s.gender ?? undefined,
      birth_date:   s.birth_date ?? '',
      parent_name:  s.parent_name ?? '',
      parent_phone: s.parent_phone ?? '',
      is_active:    s.is_active,
    });
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditTarget(null);
    setForm(emptyForm());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  // Select grade → auto-fill grade_level and class_name
  const handleGradeSelect = (gradeId: string) => {
    const g = grades.find((x) => x.id === Number(gradeId));
    if (g) {
      setForm((f) => ({
        ...f,
        grade_id:    g.id,
        grade_level: String(g.class_level),
        class_name:  g.name.replace(/^\d+/, '').replace(/^-/, '').trim() || f.class_name,
      }));
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const rawStudents: RegionStudent[] = studentsQuery.data?.students ?? studentsQuery.data?.data ?? [];
  const pagination = studentsQuery.data?.pagination;
  const isLoading  = studentsQuery.isLoading;
  const isMutating = createMutation.isPending || updateMutation.isPending;

  const totalStudents = pagination?.total ?? 0;
  const activeStudents = rawStudents.filter((s) => s.is_active).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Şagirdlər</h1>
          <p className="text-muted-foreground mt-1">Məktəbinizdəki şagirdləri idarə edin</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Şagird əlavə et
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cəmi Şagird</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktiv</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Siniflər</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{grades.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ad, soyad, UTIS kodu..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={gradeFilter || 'all'} onValueChange={(v) => { setGradeFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sinif" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün siniflər</SelectItem>
            {GRADE_LEVELS.map((g) => (
              <SelectItem key={g} value={g}>{g}-ci sinif</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || gradeFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setGradeFilter(''); }} className="gap-1">
            <X className="h-4 w-4" /> Sıfırla
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>UTIS Kodu</TableHead>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>Sinif</TableHead>
              <TableHead>Cins</TableHead>
              <TableHead>Valideyn</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 w-full rounded bg-muted animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : rawStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Şagird tapılmadı
                </TableCell>
              </TableRow>
            ) : rawStudents.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-sm">{s.utis_code ?? '—'}</TableCell>
                <TableCell className="font-medium">{s.full_name}</TableCell>
                <TableCell>
                  {s.grade_level
                    ? `${s.grade_level}${s.class_name ? `-${s.class_name}` : ''}`
                    : s.class_name || '—'}
                </TableCell>
                <TableCell className="text-sm">
                  {s.gender === 'male' ? 'Kişi' : s.gender === 'female' ? 'Qadın' : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {s.parent_name ?? '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-xs">
                    {s.is_active ? 'Aktiv' : 'Qeyri-aktiv'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { setDeleteTarget(s); setDeleteOpen(true); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Cəmi {pagination.total} şagird</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Əvvəlki</Button>
            <span className="px-3 py-1 border rounded text-sm">{page} / {pagination.last_page}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.last_page} onClick={() => setPage(p => p + 1)}>Növbəti</Button>
          </div>
        </div>
      )}

      {/* ── Create/Edit Form Dialog ─────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) closeForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Şagirdi redaktə et' : 'Yeni şagird əlavə et'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* UTIS */}
            <div className="space-y-1.5">
              <Label>UTİS Kodu <span className="text-muted-foreground text-xs">(ixtiyari)</span></Label>
              <Input
                placeholder="Məs: 1234567890"
                value={form.utis_code ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, utis_code: e.target.value }))}
              />
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ad <span className="text-destructive">*</span></Label>
                <Input
                  required
                  placeholder="Ad"
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Soyad <span className="text-destructive">*</span></Label>
                <Input
                  required
                  placeholder="Soyad"
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                />
              </div>
            </div>

            {/* Grade (class) */}
            <div className="space-y-1.5">
              <Label>Sinif <span className="text-destructive">*</span></Label>
              <Select
                value={form.grade_id ? String(form.grade_id) : ''}
                onValueChange={handleGradeSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sinif seçin" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Manual fallback if no grades */}
              {grades.length === 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Sinif səviyyəsi <span className="text-destructive">*</span></Label>
                    <Input
                      required
                      placeholder="5"
                      value={form.grade_level}
                      onChange={(e) => setForm((f) => ({ ...f, grade_level: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bölmə <span className="text-destructive">*</span></Label>
                    <Input
                      required
                      placeholder="A"
                      value={form.class_name}
                      onChange={(e) => setForm((f) => ({ ...f, class_name: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Gender + Birth date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cins</Label>
                <Select
                  value={form.gender ?? 'none'}
                  onValueChange={(v) => setForm((f) => ({ ...f, gender: v === 'none' ? undefined : v as 'male' | 'female' }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="male">Kişi</SelectItem>
                    <SelectItem value="female">Qadın</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Doğum tarixi</Label>
                <Input
                  type="date"
                  value={form.birth_date ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Parent */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valideyn adı</Label>
                <Input
                  placeholder="Valideyn adı"
                  value={form.parent_name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, parent_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valideyn telefon</Label>
                <Input
                  placeholder="+994501234567"
                  value={form.parent_phone ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, parent_phone: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Ləğv et</Button>
              <Button type="submit" disabled={isMutating}>
                {isMutating ? 'Saxlanılır...' : (editTarget ? 'Yenilə' : 'Əlavə et')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ─────────────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Şagirdi sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.full_name}</strong> — bu əməliyyat geri qaytarıla bilməz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteOpen(false); setDeleteTarget(null); }}>
              Ləğv et
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Silinir...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
