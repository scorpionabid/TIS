export type { ClassData, ClassFilters, UpdateClassPayload } from "@/services/regionadmin/classes";

export type SortColumn =
  | "institution"
  | "utis"
  | "level"
  | "name"
  | "specialty"
  | "students"
  | "teacher"
  | "year"
  | "status"
  | null;

export type SortDirection = "asc" | "desc";

export type ActiveTab = "classes" | "academic-years";

export interface EditFormState {
  name: string;
  class_level: string;
  specialty: string;
  class_type: string;
  class_profile: string;
  education_program: string;
  teaching_shift: string;
  teaching_week: string;
  student_count: string;
  is_active: boolean;
}

export const defaultEditFormState: EditFormState = {
  name: "",
  class_level: "",
  specialty: "",
  class_type: "",
  class_profile: "",
  education_program: "umumi",
  teaching_shift: "",
  teaching_week: "",
  student_count: "",
  is_active: true,
};

export function getEducationProgramLabel(program: string): string {
  const labels: Record<string, string> = {
    umumi: "Ümumi",
    xususi: "Xüsusi",
    ferdi_mekteb: "Fərdi (M)",
    ferdi_ev: "Fərdi (E)",
  };
  return labels[program] || program;
}
