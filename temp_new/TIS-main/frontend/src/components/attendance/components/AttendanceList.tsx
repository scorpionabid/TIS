import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Eye } from 'lucide-react';
import { useAttendanceStatus } from '../hooks/useAttendanceStatus';
import { AttendanceDataState } from '../hooks/useAttendanceData';

interface AttendanceListProps {
  students: any[];
  attendanceData: AttendanceDataState;
  studentsLoading: boolean;
  onStatusChange: (studentId: number, status: string) => void;
  onNotesChange: (studentId: number, notes: string) => void;
}

export const AttendanceList: React.FC<AttendanceListProps> = ({
  students,
  attendanceData,
  studentsLoading,
  onStatusChange,
  onNotesChange,
}) => {
  const { getStatusIcon, getStatusText, getStatusColor } = useAttendanceStatus();
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);

  if (studentsLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-24" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-8 bg-gray-200 rounded" />
                  <div className="w-8 h-8 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!students || students.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Bu sinif üçün şagird tapılmadı</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {students.map((student) => {
              const attendance = attendanceData[student.id] || { status: 'present', notes: '' };
              
              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {student.first_name?.[0]}{student.last_name?.[0]}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">{student.first_name} {student.last_name}</div>
                      <div className="text-sm text-muted-foreground">ID: {student.student_number || student.id}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Select
                      value={attendance.status}
                      onValueChange={(value) => onStatusChange(student.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(attendance.status)}
                          <span className="text-sm">{getStatusText(attendance.status)}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">
                          <div className="flex items-center gap-2">
                            {getStatusIcon('present')}
                            Var
                          </div>
                        </SelectItem>
                        <SelectItem value="absent">
                          <div className="flex items-center gap-2">
                            {getStatusIcon('absent')}
                            Yox
                          </div>
                        </SelectItem>
                        <SelectItem value="late">
                          <div className="flex items-center gap-2">
                            {getStatusIcon('late')}
                            Gecikmə
                          </div>
                        </SelectItem>
                        <SelectItem value="excused">
                          <div className="flex items-center gap-2">
                            {getStatusIcon('excused')}
                            İzinli
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {attendance.notes && (
                      <Badge variant="outline" className="text-xs">
                        Qeyd var
                      </Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingStudentId(student.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Notes Dialog */}
      <Dialog open={!!editingStudentId} onOpenChange={() => setEditingStudentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStudentId && students.find(s => s.id === editingStudentId) && 
                `${students.find(s => s.id === editingStudentId)!.first_name} ${students.find(s => s.id === editingStudentId)!.last_name} üçün qeyd`
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Qeyd daxil edin (məcburi deyil)..."
              value={editingStudentId ? (attendanceData[editingStudentId]?.notes || '') : ''}
              onChange={(e) => editingStudentId && onNotesChange(editingStudentId, e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingStudentId(null)}>
                İptal
              </Button>
              <Button onClick={() => setEditingStudentId(null)}>
                Yadda saxla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};