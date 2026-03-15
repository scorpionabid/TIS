import { useState, useMemo } from 'react';
import { Search, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { getRoleDisplayName } from '@/constants/roles';
import type { UserRole } from '@/constants/roles';
import { cn } from '@/lib/utils';
import { useAvailableRecipients } from '@/hooks/messages/useMessages';
import type { AvailableRecipient } from '@/types/message';
import { RoleBadge } from './RoleBadge';

interface RecipientSelectorProps {
  selected: number[];
  onChange: (ids: number[]) => void;
  /** Tək-seçim modu: yalnız bir alıcı seçilə bilər (SchoolAdmin üçün) */
  singleSelect?: boolean;
}

// Rol üzrə qruplaşdırma sırası (yuxarıdan aşağıya)
const ROLE_ORDER: UserRole[] = [
  'regionadmin',
  'regionoperator',
  'sektoradmin',
  'schooladmin',
];

function RecipientItem({
  recipient,
  isSelected,
  onToggle,
  singleSelect,
}: {
  recipient: AvailableRecipient;
  isSelected: boolean;
  onToggle: () => void;
  singleSelect?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 rounded-md',
        isSelected && 'bg-primary/5'
      )}
    >
      {/* Seçim indikatoru: radio (tək) vs checkbox (çox) */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-center transition-colors',
          singleSelect
            ? 'h-4 w-4 rounded-full border-2'
            : 'h-4 w-4 rounded border-2',
          isSelected
            ? 'bg-primary border-primary'
            : 'border-muted-foreground/40'
        )}
      >
        {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
      </div>

      {/* Avatar */}
      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold">
        {recipient.name.charAt(0).toUpperCase()}
      </div>

      {/* Məlumat */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{recipient.name}</p>
        <p className="text-xs text-muted-foreground truncate">{recipient.institution_name}</p>
      </div>

      {/* Rol badge */}
      <RoleBadge role={recipient.role} />
    </button>
  );
}


function SelectorSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function RecipientSelector({
  selected,
  onChange,
  singleSelect = false,
}: RecipientSelectorProps) {
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useAvailableRecipients();

  const recipients: AvailableRecipient[] = data?.data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return recipients;
    const q = search.toLowerCase();
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.institution_name.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q)
    );
  }, [recipients, search]);

  // Qruplara böl (yalnız multi-select modda faydalıdır)
  const grouped = useMemo(() => {
    const map = new Map<string, AvailableRecipient[]>();
    for (const role of ROLE_ORDER) {
      const group = filtered.filter((r) => r.role === role);
      if (group.length > 0) map.set(role, group);
    }
    // Naməlum rollar sona
    const otherRoles = filtered.filter((r) => !ROLE_ORDER.includes(r.role as UserRole));
    if (otherRoles.length > 0) map.set('other', otherRoles);
    return map;
  }, [filtered]);

  const handleToggle = (id: number) => {
    if (singleSelect) {
      // Eyni seçilibsə — ləğv et, yoxsa — yeganə olaraq seç
      onChange(selected.includes(id) ? [] : [id]);
    } else {
      onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
    }
  };

  const selectedRecipient = singleSelect && selected.length > 0
    ? recipients.find((r) => r.id === selected[0])
    : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Tək-seçim modda seçilmiş şəxsin adı */}
      {singleSelect && selectedRecipient && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-md border border-primary/20">
          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
            {selectedRecipient.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{selectedRecipient.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {selectedRecipient.institution_name}
            </p>
          </div>
          <RoleBadge role={selectedRecipient.role} />
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Axtarış */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={singleSelect ? 'Rəhbər axtar...' : 'Ad, müəssisə və ya rol axtar...'}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* Siyahı */}
      <div className="flex flex-col max-h-64 overflow-y-auto gap-0.5 rounded-md border p-1">
        {isLoading && <SelectorSkeleton />}
        {error && (
          <p className="text-sm text-destructive px-3 py-2">
            Alıcılar yüklənərkən xəta baş verdi.
          </p>
        )}
        {!isLoading && !error && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground px-3 py-2 text-center">Alıcı tapılmadı</p>
        )}

        {!isLoading && !error && Array.from(grouped.entries()).map(([role, users]) => (
          <div key={role}>
            {/* Qrup başlığı (tək-seçim modda da göstər) */}
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-3 pt-2 pb-1">
              {role === 'other' ? 'Digər' : getRoleDisplayName(role as UserRole)}
            </p>
            {users.map((recipient) => (
              <RecipientItem
                key={recipient.id}
                recipient={recipient}
                isSelected={selected.includes(recipient.id)}
                onToggle={() => handleToggle(recipient.id)}
                singleSelect={singleSelect}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Çox-seçim modda sayğac */}
      {!singleSelect && selected.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">{selected.length} seçilib</p>
      )}
    </div>
  );
}
