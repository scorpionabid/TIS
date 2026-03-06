import { type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { type CheckedState } from "@radix-ui/react-checkbox";
import {
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
} from "lucide-react";
import { TablePagination } from "@/components/common/TablePagination";
import { ClassData } from "@/services/regionadmin/classes";
import { type SortColumn, type SortDirection, getEducationProgramLabel } from "./types";

interface ClassTableProps {
  classes: ClassData[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  classesLoading: boolean;
  isFetching: boolean;
  classesErrorMessage: string | null;
  waitingForRegionSelection: boolean;
  regionsLoading: boolean;
  selectedClasses: number[];
  allPageSelected: boolean;
  partiallySelected: boolean;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSelectRow: (id: number) => void;
  onSelectAllOnPage: (checked: CheckedState) => void;
  onSort: (column: string) => void;
  onEdit: (cls: ClassData) => void;
  onDelete: (cls: ClassData) => void;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onRetry: () => void;
}

function getSortIcon(
  column: string,
  sortColumn: SortColumn,
  sortDirection: SortDirection,
): ReactNode {
  if (sortColumn !== column) {
    return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
  }
  return sortDirection === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5 ml-1" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 ml-1" />
  );
}

export const ClassTable = ({
  classes,
  totalItems,
  totalPages,
  currentPage,
  perPage,
  classesLoading,
  isFetching,
  classesErrorMessage,
  waitingForRegionSelection,
  regionsLoading,
  selectedClasses,
  allPageSelected,
  partiallySelected,
  sortColumn,
  sortDirection,
  onSelectRow,
  onSelectAllOnPage,
  onSort,
  onEdit,
  onDelete,
  onPageChange,
  onPerPageChange,
  onRetry,
}: ClassTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Siniflər
          {!waitingForRegionSelection && ` (${totalItems})`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {classesErrorMessage ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-destructive">{classesErrorMessage}</p>
            <Button size="sm" variant="outline" onClick={onRetry}>
              Yenidən cəhd et
            </Button>
          </div>
        ) : waitingForRegionSelection ? (
          <div className="text-center py-8 text-muted-foreground">
            {regionsLoading
              ? "Region siyahısı yüklənir..."
              : "Zəhmət olmasa region seçin"}
          </div>
        ) : classesLoading && !isFetching ? (
          <div className="text-center py-8 text-muted-foreground">
            Yüklənir...
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Heç bir sinif tapılmadı
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-md border overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 w-10">
                      <Checkbox
                        aria-label="Hamısını seç"
                        checked={
                          allPageSelected
                            ? true
                            : partiallySelected
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={onSelectAllOnPage}
                      />
                    </th>
                    <th
                      className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition select-none"
                      onClick={() => onSort("institution")}
                    >
                      <div className="flex items-center">
                        Müəssisə
                        {getSortIcon("institution", sortColumn, sortDirection)}
                      </div>
                    </th>
                    <th
                      className="p-3 text-left font-medium text-xs cursor-pointer hover:bg-muted/70 transition select-none"
                      onClick={() => onSort("utis")}
                    >
                      <div className="flex items-center">
                        UTIS
                        {getSortIcon("utis", sortColumn, sortDirection)}
                      </div>
                    </th>
                    <th
                      className="p-3 text-center font-medium cursor-pointer hover:bg-muted/70 transition select-none"
                      onClick={() => onSort("level")}
                    >
                      <div className="flex items-center justify-center">
                        Səviyyə
                        {getSortIcon("level", sortColumn, sortDirection)}
                      </div>
                    </th>
                    <th
                      className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition select-none"
                      onClick={() => onSort("name")}
                    >
                      <div className="flex items-center">
                        Sinif
                        {getSortIcon("name", sortColumn, sortDirection)}
                      </div>
                    </th>
                    <th
                      className="p-3 text-left font-medium cursor-pointer hover:bg-muted/70 transition select-none"
                      onClick={() => onSort("specialty")}
                    >
                      <div className="flex items-center">
                        İxtisas
                        {getSortIcon("specialty", sortColumn, sortDirection)}
                      </div>
                    </th>
                    <th className="p-3 text-left font-medium text-xs">
                      Sinfin tipi
                    </th>
                    <th className="p-3 text-left font-medium text-xs">
                      Profil
                    </th>
                    <th className="p-3 text-left font-medium text-xs">
                      Növbə
                    </th>
                    <th className="p-3 text-left font-medium text-xs">
                      Proqram
                    </th>
                    <th
                      className="p-3 text-center font-medium cursor-pointer hover:bg-muted/70 transition select-none"
                      onClick={() => onSort("students")}
                    >
                      <div className="flex items-center justify-center">
                        Şagird
                        {getSortIcon("students", sortColumn, sortDirection)}
                      </div>
                    </th>
                    <th className="p-3 text-center font-medium text-xs">
                      O/Q
                    </th>
                    <th
                      className="p-3 text-left font-medium text-xs cursor-pointer hover:bg-muted/70 transition select-none"
                      onClick={() => onSort("teacher")}
                    >
                      <div className="flex items-center">
                        Sinif Müəllimi
                        {getSortIcon("teacher", sortColumn, sortDirection)}
                      </div>
                    </th>
                    <th
                      className="p-3 text-left font-medium text-xs cursor-pointer hover:bg-muted/70 transition select-none"
                      onClick={() => onSort("year")}
                    >
                      <div className="flex items-center">
                        Tədris İli
                        {getSortIcon("year", sortColumn, sortDirection)}
                      </div>
                    </th>
                    <th
                      className="p-3 text-center font-medium cursor-pointer hover:bg-muted/70 transition select-none"
                      onClick={() => onSort("status")}
                    >
                      <div className="flex items-center justify-center">
                        Status
                        {getSortIcon("status", sortColumn, sortDirection)}
                      </div>
                    </th>
                    <th className="p-3 text-right font-medium text-xs">
                      Əməliyyatlar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls) => (
                    <tr
                      key={cls.id}
                      className="border-b hover:bg-muted/30 transition"
                    >
                      <td className="p-3 w-10">
                        <Checkbox
                          checked={selectedClasses.includes(cls.id)}
                          onCheckedChange={() => onSelectRow(cls.id)}
                          aria-label={`${cls.name} seç`}
                        />
                      </td>
                      {/* Institution */}
                      <td className="p-3">
                        <div className="font-medium text-sm">
                          {cls.institution?.name || "-"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {cls.institution?.type || ""}
                        </div>
                      </td>
                      {/* UTIS Code */}
                      <td className="p-3">
                        {cls.institution?.utis_code ? (
                          <Badge
                            variant="outline"
                            className="text-xs font-mono"
                          >
                            {cls.institution.utis_code}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </td>
                      {/* Class Level */}
                      <td className="p-3 text-center">
                        <Badge variant="secondary" className="font-semibold">
                          {cls.class_level}
                        </Badge>
                      </td>
                      {/* Class Name */}
                      <td className="p-3">
                        <span className="font-bold text-lg">{cls.name}</span>
                      </td>
                      {/* Specialty */}
                      <td className="p-3">
                        <span className="text-sm">
                          {cls.specialty || "-"}
                        </span>
                      </td>
                      {/* Class Type */}
                      <td className="p-3">
                        {cls.class_type ? (
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-800"
                          >
                            {cls.class_type}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </td>
                      {/* Class Profile */}
                      <td className="p-3">
                        {cls.class_profile ? (
                          <span className="text-sm">{cls.class_profile}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </td>
                      {/* Teaching shift */}
                      <td className="p-3">
                        {cls.teaching_shift ? (
                          <Badge variant="outline" className="text-xs">
                            {cls.teaching_shift}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </td>
                      {/* Education Program */}
                      <td className="p-3">
                        {cls.education_program ? (
                          <Badge variant="outline" className="text-xs">
                            {getEducationProgramLabel(cls.education_program)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </td>
                      {/* Student Count */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-base">
                            {cls.student_count}
                          </span>
                        </div>
                      </td>
                      {/* Gender Split */}
                      <td className="p-3">
                        <div className="flex gap-2 justify-center text-sm">
                          <span className="text-blue-600 font-medium">
                            ♂{cls.male_student_count}
                          </span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-pink-600 font-medium">
                            ♀{cls.female_student_count}
                          </span>
                        </div>
                      </td>
                      {/* Homeroom Teacher */}
                      <td className="p-3">
                        {cls.homeroomTeacher ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {cls.homeroomTeacher.first_name}{" "}
                              {cls.homeroomTeacher.last_name}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Təyin olunmayıb
                          </span>
                        )}
                      </td>
                      {/* Academic Year */}
                      <td className="p-3">
                        <div className="text-xs">
                          {cls.academicYear?.year}
                          {cls.academicYear?.is_current && (
                            <Badge
                              variant="default"
                              className="ml-1 text-xs py-0 px-1"
                            >
                              Cari
                            </Badge>
                          )}
                        </div>
                      </td>
                      {/* Status */}
                      <td className="p-3 text-center">
                        <Badge
                          variant={cls.is_active ? "default" : "secondary"}
                          className={
                            cls.is_active ? "bg-green-600" : "bg-gray-400"
                          }
                        >
                          {cls.is_active ? "Aktiv" : "Passiv"}
                        </Badge>
                      </td>
                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onEdit(cls)}
                            aria-label="Düzəliş et"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDelete(cls)}
                            aria-label="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {classes.map((cls) => (
                <Card key={cls.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3 pb-3 border-b">
                      <div className="flex items-start gap-3 flex-1 pr-2">
                        <Checkbox
                          checked={selectedClasses.includes(cls.id)}
                          onCheckedChange={() => onSelectRow(cls.id)}
                          aria-label={`${cls.name} seç`}
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="secondary"
                              className="font-semibold text-base"
                            >
                              {cls.class_level}
                            </Badge>
                            <span className="font-bold text-xl">
                              {cls.name}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-muted-foreground">
                            {cls.institution?.name}
                          </div>
                          {cls.institution?.utis_code && (
                            <Badge
                              variant="outline"
                              className="text-xs font-mono mt-1"
                            >
                              {cls.institution.utis_code}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant={cls.is_active ? "default" : "secondary"}
                          className={
                            cls.is_active ? "bg-green-600" : "bg-gray-400"
                          }
                        >
                          {cls.is_active ? "Aktiv" : "Passiv"}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onEdit(cls)}
                            aria-label="Düzəliş et"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDelete(cls)}
                            aria-label="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="space-y-2.5">
                      {cls.specialty && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            İxtisas:
                          </span>
                          <span className="font-medium">{cls.specialty}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Sinfin tipi:
                        </span>
                        <div>
                          {cls.class_type ? (
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-800"
                            >
                              {cls.class_type}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Profil:</span>
                        <span className="font-medium">
                          {cls.class_profile || "-"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Növbə:</span>
                        {cls.teaching_shift ? (
                          <Badge variant="outline" className="text-xs">
                            {cls.teaching_shift}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </div>

                      {cls.education_program && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Proqram:
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getEducationProgramLabel(cls.education_program)}
                          </Badge>
                        </div>
                      )}

                      {/* Student Count */}
                      <div className="flex items-center justify-between text-sm pt-2 border-t">
                        <span className="text-muted-foreground">
                          Şagird sayı:
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-base">
                              {cls.student_count}
                            </span>
                          </div>
                          <div className="flex gap-2 text-sm">
                            <span className="text-blue-600 font-medium">
                              ♂{cls.male_student_count}
                            </span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-pink-600 font-medium">
                              ♀{cls.female_student_count}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Homeroom Teacher */}
                      {cls.homeroomTeacher && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Sinif müəllimi:
                          </span>
                          <span className="font-medium">
                            {cls.homeroomTeacher.first_name}{" "}
                            {cls.homeroomTeacher.last_name}
                          </span>
                        </div>
                      )}

                      {/* Academic Year */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Tədris ili:
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">
                            {cls.academicYear?.year}
                          </span>
                          {cls.academicYear?.is_current && (
                            <Badge
                              variant="default"
                              className="text-xs py-0 px-1.5"
                            >
                              Cari
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-4">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={perPage}
                onPageChange={onPageChange}
                onNext={() =>
                  onPageChange(Math.min(currentPage + 1, totalPages))
                }
                onPrevious={() => onPageChange(Math.max(currentPage - 1, 1))}
                onItemsPerPageChange={onPerPageChange}
                startIndex={(currentPage - 1) * perPage}
                endIndex={Math.min(currentPage * perPage, totalItems)}
                canGoNext={currentPage < totalPages}
                canGoPrevious={currentPage > 1}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
