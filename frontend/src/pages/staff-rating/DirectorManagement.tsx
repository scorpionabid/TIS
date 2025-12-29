import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { directorService } from '@/services/staffRating';
import { userService } from '@/services/users';
import { institutionService } from '@/services/institutions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Search, Edit, Trash2, Building2, User, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DirectorAssignment } from '@/types/staffRating';
import type { Institution } from '@/services/institutions';
import type { User as UserType } from '@/types/user';

export default function DirectorManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedDirector, setSelectedDirector] = useState<DirectorAssignment | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all directors
  const { data, isLoading } = useQuery({
    queryKey: ['directors', selectedRegion, selectedSector, searchTerm],
    queryFn: () =>
      directorService.getAll({
        region_id: selectedRegion !== 'all' ? Number(selectedRegion) : undefined,
        sector_id: selectedSector !== 'all' ? Number(selectedSector) : undefined,
        search: searchTerm || undefined,
      }),
  });

  // Assign director mutation
  const assignMutation = useMutation({
    mutationFn: (data: { institution_id: number; user_id: number; notes?: string }) =>
      directorService.assign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directors'] });
      toast({
        title: 'Uğurlu',
        description: 'Direktor təyin edildi',
      });
      setAssignModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Remove director mutation
  const removeMutation = useMutation({
    mutationFn: ({ institutionId, reason }: { institutionId: number; reason?: string }) =>
      directorService.remove(institutionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directors'] });
      toast({
        title: 'Uğurlu',
        description: 'Direktor silindi',
      });
      setRemoveModalOpen(false);
      setSelectedDirector(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  const directors = data?.directors as DirectorAssignment[];

  const handleRemove = (director: DirectorAssignment) => {
    setSelectedDirector(director);
    setRemoveModalOpen(true);
  };

  const confirmRemove = () => {
    if (selectedDirector) {
      removeMutation.mutate({
        institutionId: selectedDirector.institution_id,
        reason: 'RegionAdmin tərəfindən silindi',
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Direktor İdarəetməsi</h1>
          <p className="text-muted-foreground mt-2">
            Təhsil müəssisələrinin direktorlarını idarə edin
          </p>
        </div>
        <Button onClick={() => setAssignModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Direktor Təyin Et
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ad və ya müəssisə axtar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Region seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün regionlar</SelectItem>
                {/* Add regions dynamically */}
              </SelectContent>
            </Select>
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger>
                <SelectValue placeholder="Sektor seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün sektorlar</SelectItem>
                {/* Add sectors dynamically */}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Directors List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : directors && directors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {directors.map((directorData) => (
            <Card key={directorData.institution_id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">
                      {directorData.institution_name}
                    </CardTitle>
                  </div>
                  <Badge variant="outline">{directorData.institution_type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{directorData.director.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {directorData.director.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Təyin tarixi: {new Date(directorData.director.appointment_date).toLocaleDateString('az-AZ')}
                    </p>
                  </div>
                  <Badge
                    variant={directorData.director.status === 'active' ? 'default' : 'secondary'}
                  >
                    {directorData.director.status === 'active' ? 'Aktiv' : 'Deaktiv'}
                  </Badge>
                </div>

                {directorData.director.notes && (
                  <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                    {directorData.director.notes}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Redaktə
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(directorData)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Sil
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Direktor tapılmadı</p>
          </CardContent>
        </Card>
      )}

      {/* Assign Director Dialog */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Direktor Təyin Et</DialogTitle>
            <DialogDescription>
              Müəssisəyə direktor təyin edin
            </DialogDescription>
          </DialogHeader>
          <AssignDirectorForm
            onSubmit={(data) => assignMutation.mutate(data)}
            isLoading={assignMutation.isPending}
            onCancel={() => setAssignModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Remove Director Dialog */}
      <Dialog open={removeModalOpen} onOpenChange={setRemoveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Direktoru Sil</DialogTitle>
            <DialogDescription>
              Bu əməliyyatı təsdiq etmək istədiyinizdən əminsiniz?
            </DialogDescription>
          </DialogHeader>
          {selectedDirector && (
            <div className="py-4">
              <p className="text-sm">
                <span className="font-semibold">{selectedDirector.director.name}</span> adlı
                direktor{' '}
                <span className="font-semibold">{selectedDirector.institution_name}</span>{' '}
                müəssisəsindən silinəcək.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveModalOpen(false)}>
              İmtina
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemove}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Assign Director Form Component
function AssignDirectorForm({
  onSubmit,
  isLoading,
  onCancel,
}: {
  onSubmit: (data: { institution_id: number; user_id: number; notes?: string }) => void;
  isLoading: boolean;
  onCancel: () => void;
}) {
  const [institutionId, setInstitutionId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [institutionOpen, setInstitutionOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  // Fetch institutions
  const { data: institutionsData } = useQuery({
    queryKey: ['institutions', institutionSearch],
    queryFn: () => institutionService.getInstitutions({
      search: institutionSearch || undefined,
      per_page: 50
    }),
  });

  // Fetch users with SchoolAdmin role
  const { data: usersData } = useQuery({
    queryKey: ['users', 'schooladmin', userSearch],
    queryFn: () => userService.getUsers({
      role: 'schooladmin',
      search: userSearch || undefined,
      per_page: 50
    }),
  });

  const institutions = institutionsData?.data || [];
  const users = usersData?.data || [];

  const selectedInstitution = institutions.find((i) => i.id === institutionId);
  const selectedUser = users.find((u) => u.id === userId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionId || !userId) return;

    onSubmit({
      institution_id: institutionId,
      user_id: userId,
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="institution">Müəssisə *</Label>
        <Popover open={institutionOpen} onOpenChange={setInstitutionOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={institutionOpen}
              className="w-full justify-between"
            >
              {selectedInstitution ? selectedInstitution.name : "Müəssisə seçin"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput
                placeholder="Müəssisə axtar..."
                value={institutionSearch}
                onValueChange={setInstitutionSearch}
              />
              <CommandEmpty>Müəssisə tapılmadı</CommandEmpty>
              <CommandGroup className="max-h-[200px] overflow-auto">
                {institutions.map((institution) => (
                  <CommandItem
                    key={institution.id}
                    value={institution.name}
                    onSelect={() => {
                      setInstitutionId(institution.id);
                      setInstitutionOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        institutionId === institution.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {institution.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="user">İstifadəçi (SchoolAdmin) *</Label>
        <Popover open={userOpen} onOpenChange={setUserOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={userOpen}
              className="w-full justify-between"
            >
              {selectedUser ? selectedUser.name || selectedUser.email : "İstifadəçi seçin"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput
                placeholder="İstifadəçi axtar..."
                value={userSearch}
                onValueChange={setUserSearch}
              />
              <CommandEmpty>İstifadəçi tapılmadı</CommandEmpty>
              <CommandGroup className="max-h-[200px] overflow-auto">
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.name || user.email}
                    onSelect={() => {
                      setUserId(user.id);
                      setUserOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        userId === user.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{user.name || user.email}</span>
                      {user.name && <span className="text-xs text-muted-foreground">{user.email}</span>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Qeydlər (opsional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Əlavə məlumat daxil edin..."
          rows={3}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          İmtina
        </Button>
        <Button type="submit" disabled={isLoading || !institutionId || !userId}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Təyin Et
        </Button>
      </DialogFooter>
    </form>
  );
}
