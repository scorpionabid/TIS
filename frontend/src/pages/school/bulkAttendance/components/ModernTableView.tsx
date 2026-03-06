import React, { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { StickyNote, Minus, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ClassWithAttendance } from '@/services/bulkAttendance';
import {
  AttendanceFormData,
  AttendanceSession,
  ServerErrorMap,
} from '../types';

interface ModernTableViewProps {
  session: AttendanceSession;
  classes: ClassWithAttendance[];
  attendanceData: AttendanceFormData;
  updateAttendance: (
    gradeId: number,
    field: keyof AttendanceFormData[string],
    value: number | string
  ) => void;
  errors: Record<string, string>;
  serverErrors?: ServerErrorMap;
  getAttendanceRate: (present: number, total: number) => number;
}

const ModernTableView: React.FC<ModernTableViewProps> = ({
  session,
  classes,
  attendanceData,
  updateAttendance,
  errors,
  serverErrors = {},
  getAttendanceRate,
}) => {
  const [notePopoverOpen, setNotePopoverOpen] = useState<number | null>(null);

  const toSafeNumber = (value: unknown): number => {
    if (value === undefined || value === null) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const summary = useMemo(() => {
    return classes.reduce(
      (acc, cls) => {
        const data = attendanceData[cls.id];
        if (!data || cls.total_students === 0) return acc;

        const morningExcused = toSafeNumber(data.morning_excused);
        const morningUnexcused = toSafeNumber(data.morning_unexcused);
        const eveningExcused = toSafeNumber(data.evening_excused);
        const eveningUnexcused = toSafeNumber(data.evening_unexcused);

        const morningPresent = Math.max(
          0,
          cls.total_students - (morningExcused + morningUnexcused)
        );
        const eveningPresent = Math.max(
          0,
          cls.total_students - (eveningExcused + eveningUnexcused)
        );
        const sessionExcused =
          session === 'morning' ? morningExcused : eveningExcused;
        const sessionUnexcused =
          session === 'morning' ? morningUnexcused : eveningUnexcused;
        const sessionPresent =
          session === 'morning' ? morningPresent : eveningPresent;

        acc.totalStudents += cls.total_students;
        acc.totalPresent += sessionPresent;
        acc.totalExcused += sessionExcused;
        acc.totalUnexcused += sessionUnexcused;
        acc.classesCompleted +=
          sessionPresent + sessionExcused + sessionUnexcused === cls.total_students ? 1 : 0;
        acc.totalStudentSessions += cls.total_students * 2;
        acc.totalPresentSessions += morningPresent + eveningPresent;
        acc.totalUniformViolation += toSafeNumber(data.uniform_violation);

        return acc;
      },
      {
        totalStudents: 0,
        totalPresent: 0,
        totalExcused: 0,
        totalUnexcused: 0,
        classesCompleted: 0,
        totalStudentSessions: 0,
        totalPresentSessions: 0,
        totalUniformViolation: 0,
      }
    );
  }, [attendanceData, classes, session]);

  const sessionRate =
    summary.totalStudents > 0
      ? Math.round((summary.totalPresent / summary.totalStudents) * 100)
      : 0;

  const uniformComplianceRate =
    summary.totalPresent > 0
      ? Math.round((1 - summary.totalUniformViolation / summary.totalPresent) * 100)
      : 0;

  const overallDailyRate =
    summary.totalStudentSessions > 0
      ? Math.round((summary.totalPresentSessions / summary.totalStudentSessions) * 100)
      : 0;

  const getGradeBadgeStyle = (level: number) => {
    if (level <= 4) return 'bg-gradient-to-br from-[#43a047] to-[#66bb6a]'; // A - green
    if (level <= 9) return 'bg-gradient-to-br from-[#1e88e5] to-[#42a5f5]'; // B - blue
    return 'bg-gradient-to-br from-[#7c4dff] to-[#b388ff]'; // C - purple
  };

  const NumberControl: React.FC<{
    value: number;
    onDecrease: () => void;
    onIncrease: () => void;
    disabled?: boolean;
    color?: 'default' | 'orange';
  }> = ({ value, onDecrease, onIncrease, disabled, color = 'default' }) => {
    const minusColor = color === 'orange' ? 'text-[#e65100] border-[#e65100]' : 'text-[#e53935] border-[#e53935]';
    const plusColor = 'text-[#43a047] border-[#43a047]';
    const valueColor = color === 'orange' ? 'text-[#e65100]' : '';

    return (
      <div className="inline-flex items-center gap-1">
        <button
          onClick={onDecrease}
          disabled={disabled || value <= 0}
          className={`w-6 h-6 rounded-full border-[1.5px] ${minusColor} bg-white font-bold text-sm flex items-center justify-center transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          −
        </button>
        <span className={`min-w-6 font-bold text-center text-sm ${valueColor}`}>{value}</span>
        <button
          onClick={onIncrease}
          disabled={disabled}
          className={`w-6 h-6 rounded-full border-[1.5px] ${plusColor} bg-white font-bold text-sm flex items-center justify-center transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          +
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Table Card */}
      <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] overflow-x-auto">
        <Table className="w-full table-fixed min-w-[1100px]">
          <TableHeader>
            <TableRow className="bg-[#f5f7fb] border-b-2 border-[#e8eaf6] hover:bg-[#f5f7fb]">
              <TableHead className="w-10 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">#</TableHead>
              <TableHead className="w-14 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Səviyyə</TableHead>
              <TableHead className="w-[160px] py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sinif</TableHead>
              <TableHead className="w-16 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Say</TableHead>
              <TableHead className="w-24 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Dərsdə</TableHead>
              <TableHead className="w-24 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">🟢 Üzürlü</TableHead>
              <TableHead className="w-24 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">🔴 Üzürsüz</TableHead>
              <TableHead className="w-24 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">👔 Forma</TableHead>
              <TableHead className="w-[140px] py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Davamiyyət</TableHead>
              <TableHead className="w-16 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Qeyd</TableHead>
              <TableHead className="w-16 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((cls, index) => {
              const data = attendanceData[cls.id] ?? {
                morning_present: cls.total_students,
                morning_excused: 0,
                morning_unexcused: 0,
                evening_present: cls.total_students,
                evening_excused: 0,
                evening_unexcused: 0,
                uniform_violation: 0,
                morning_notes: "",
                evening_notes: "",
              };

              const excused = toSafeNumber(data[`${session}_excused`]);
              const unexcused = toSafeNumber(data[`${session}_unexcused`]);
              const uniformViolation = toSafeNumber(data.uniform_violation);
              const calculatedPresent = Math.max(0, cls.total_students - (excused + unexcused));
              const present = Number.isFinite(calculatedPresent) ? calculatedPresent : 0;
              const sessionTotal = present + excused + unexcused;
              const attendanceRate = getAttendanceRate(present, cls.total_students);
              const hasError = errors[`${cls.id}_${session}`];
              const serverError = serverErrors[cls.id];
              const rowHasError = Boolean(hasError || serverError);
              const isRecorded = cls.attendance?.[`${session}_recorded_at`];
              const hasStudentCount = cls.total_students > 0;
              const isMismatch = hasStudentCount && sessionTotal !== cls.total_students;

              const statusColor = !hasStudentCount
                ? 'text-yellow-500'
                : rowHasError
                ? 'text-red-500'
                : isMismatch
                ? 'text-orange-500'
                : isRecorded
                ? 'text-green-500'
                : 'text-gray-400';

              return (
                <TableRow
                  key={cls.id}
                  className={`border-b border-[#f0f0f0] transition-colors hover:bg-[#f8f9ff] ${
                    rowHasError ? 'bg-red-50' : isMismatch ? 'bg-orange-50' : ''
                  }`}
                >
                  <TableCell className="py-2.5 text-center font-bold text-gray-400">{index + 1}</TableCell>
                  <TableCell className="py-2.5 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-white font-bold text-sm ${getGradeBadgeStyle(
                        toSafeNumber(cls.level)
                      )}`}
                    >
                      {cls.level || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 pr-3">
                    <div className="font-bold text-[15px]">{cls.name}</div>
                    {cls.homeroom_teacher && (
                      <div className="text-xs text-gray-500">{cls.homeroom_teacher.name}</div>
                    )}
                    {serverError && (
                      <div className="text-xs text-red-600 mt-1">{serverError.reason}</div>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 text-center font-bold">{cls.total_students}</TableCell>
                  <TableCell className="py-2.5 text-center font-extrabold text-[#1e88e5] text-base">
                    {hasStudentCount ? present : '—'}
                  </TableCell>
                  <TableCell className="py-2.5 text-center">
                    <NumberControl
                      value={excused}
                      onDecrease={() =>
                        updateAttendance(cls.id, `${session}_excused`, Math.max(0, excused - 1))
                      }
                      onIncrease={() =>
                        updateAttendance(cls.id, `${session}_excused`, excused + 1)
                      }
                      disabled={!hasStudentCount}
                    />
                  </TableCell>
                  <TableCell className="py-2.5 text-center">
                    <NumberControl
                      value={unexcused}
                      onDecrease={() =>
                        updateAttendance(cls.id, `${session}_unexcused`, Math.max(0, unexcused - 1))
                      }
                      onIncrease={() =>
                        updateAttendance(cls.id, `${session}_unexcused`, unexcused + 1)
                      }
                      disabled={!hasStudentCount}
                    />
                  </TableCell>
                  <TableCell className="py-2.5 text-center">
                    <NumberControl
                      value={uniformViolation}
                      onDecrease={() =>
                        updateAttendance(cls.id, 'uniform_violation', Math.max(0, uniformViolation - 1))
                      }
                      onIncrease={() =>
                        updateAttendance(cls.id, 'uniform_violation', uniformViolation + 1)
                      }
                      disabled={!hasStudentCount}
                      color="orange"
                    />
                  </TableCell>
                  <TableCell className="py-2.5 text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <div className="w-14 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#43a047] to-[#66bb6a]"
                          style={{ width: `${attendanceRate}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          attendanceRate === 100 ? 'text-[#43a047]' : 'text-[#e65100]'
                        }`}
                      >
                        {attendanceRate}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-center">
                    <Popover
                      open={notePopoverOpen === cls.id}
                      onOpenChange={(open) => setNotePopoverOpen(open ? cls.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant={data[`${session}_notes`] ? 'default' : 'ghost'}
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg"
                        >
                          <StickyNote className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 rounded-xl">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Qeydlər - {cls.name}</h4>
                          <Textarea
                            value={data[`${session}_notes`]}
                            onChange={(e) =>
                              updateAttendance(cls.id, `${session}_notes`, e.target.value)
                            }
                            placeholder={`${session === 'morning' ? 'İlk dərs' : 'Son dərs'} üçün qeydlər...`}
                            rows={3}
                            className="rounded-lg"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className={`py-2.5 text-center ${statusColor}`}>
                    {!hasStudentCount ? (
                      <AlertCircle className="h-5 w-5 mx-auto" />
                    ) : rowHasError ? (
                      <AlertCircle className="h-5 w-5 mx-auto" />
                    ) : isRecorded ? (
                      <CheckCircle className="h-5 w-5 mx-auto" />
                    ) : (
                      <AlertCircle className="h-5 w-5 mx-auto opacity-50" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ModernTableView;
