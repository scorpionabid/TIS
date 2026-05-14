import { Button } from "@/components/ui/button";

type InstitutionLevel = "all" | "region" | "sector" | "school";

interface InstitutionLevelFilterProps {
  value: string;
  currentUserRole: string | null | undefined;
  onChange: (level: InstitutionLevel) => void;
}

const LEVELS: Array<{ value: InstitutionLevel; label: string }> = [
  { value: "all", label: "Hamısı" },
  { value: "region", label: "Region" },
  { value: "sector", label: "Sektor" },
  { value: "school", label: "Məktəb" },
];

const ALLOWED_ROLES = ["superadmin", "regionadmin", "sektoradmin"];

export function InstitutionLevelFilter({ value, currentUserRole, onChange }: InstitutionLevelFilterProps) {
  if (!currentUserRole || !ALLOWED_ROLES.includes(currentUserRole)) return null;

  return (
    <div className="flex items-center gap-2 pb-2">
      {LEVELS.map(level => (
        <Button
          key={level.value}
          variant={value === level.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(level.value)}
          className="rounded-full h-8 text-xs px-4"
        >
          {level.label}
        </Button>
      ))}
    </div>
  );
}
