import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScheduleSlot, ScheduleClass, Subject, Teacher, Room } from '@/services/schedule';

interface SlotEditModalProps {
  slot: ScheduleSlot;
  classes: ScheduleClass[];
  subjects: Subject[];
  teachers: Teacher[];
  rooms: Room[];
  timeSlots: Array<{
    id: string;
    start_time: string;
    end_time: string;
    duration: number;
  }>;
  onSave: (slot: ScheduleSlot) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export const SlotEditModal: React.FC<SlotEditModalProps> = ({
  slot,
  classes,
  subjects,
  teachers,
  rooms,
  timeSlots,
  onSave,
  onDelete,
  onCancel
}) => {
  const [editedSlot, setEditedSlot] = useState<ScheduleSlot>(slot);

  const handleSave = () => {
    // Update references
    const selectedClass = classes.find(c => c.id === editedSlot.class_id);
    const selectedSubject = subjects.find(s => s.id === editedSlot.subject_id);
    const selectedTeacher = teachers.find(t => t.id === editedSlot.teacher_id);
    const selectedRoom = rooms.find(r => r.id === editedSlot.room_id);

    onSave({
      ...editedSlot,
      class: selectedClass,
      subject: selectedSubject,
      teacher: selectedTeacher,
      room: selectedRoom,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Dərs Slotunu Redaktə Et</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Sinif</Label>
            <Select
              value={editedSlot.class_id.toString()}
              onValueChange={(value) => setEditedSlot(prev => ({ ...prev, class_id: Number(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name} ({cls.grade_level}-ci sinif)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Fənn</Label>
            <Select
              value={editedSlot.subject_id.toString()}
              onValueChange={(value) => setEditedSlot(prev => ({ ...prev, subject_id: Number(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id.toString()}>
                    {subject.name} ({subject.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Müəllim</Label>
            <Select
              value={editedSlot.teacher_id.toString()}
              onValueChange={(value) => setEditedSlot(prev => ({ ...prev, teacher_id: Number(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teachers.map(teacher => (
                  <SelectItem key={teacher.id} value={teacher.id.toString()}>
                    {teacher.first_name} {teacher.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Otaq</Label>
            <Select
              value={editedSlot.room_id?.toString() || ''}
              onValueChange={(value) => setEditedSlot(prev => ({ 
                ...prev, 
                room_id: value ? Number(value) : undefined 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Otaq seçin" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map(room => (
                  <SelectItem key={room.id} value={room.id.toString()}>
                    {room.name} (Tutum: {room.capacity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <div className="flex justify-between p-6">
          <Button variant="destructive" onClick={onDelete}>
            <X className="h-4 w-4 mr-2" />
            Sil
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Ləğv et
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Saxla
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};