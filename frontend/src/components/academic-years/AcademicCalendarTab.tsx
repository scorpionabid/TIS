import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { academicCalendarService, AcademicCalendar, CalendarEntry } from '@/services/academicCalendar';
import { AcademicYear } from '@/services/academicYears';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isSameDay } from 'date-fns';
import { az } from 'date-fns/locale';
import { Loader2, Plus, Info, Calendar as CalendarIcon, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface AcademicCalendarTabProps {
  activeYear: AcademicYear | undefined;
}

export const AcademicCalendarTab: React.FC<AcademicCalendarTabProps> = ({ activeYear }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventType, setEventType] = useState<'holiday' | 'vacation' | 'mourning' | 'non_teaching'>('holiday');
  const [eventName, setEventName] = useState('');

  // Fetch calendar for current active year
  const { data: calendar, isLoading, isError } = useQuery({
    queryKey: ['academic-calendar', activeYear?.id],
    queryFn: () => activeYear ? academicCalendarService.getByAcademicYear(activeYear.id) : null,
    enabled: !!activeYear
  });

  // Create calendar mutation
  const createCalendarMutation = useMutation({
    mutationFn: (data: any) => academicCalendarService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-calendar'] });
      toast({ title: 'Uğur', description: 'Tədris təqvimi yaradıldı' });
    }
  });

  // Toggle date mutation
  const toggleDateMutation = useMutation({
    mutationFn: (data: { date: string, isSet: boolean, type: string, name: string }) => 
      calendar ? academicCalendarService.toggleDate(calendar.id, data.date, data.isSet, data.type, data.name) : Promise.reject('No calendar'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-calendar'] });
      setIsModalOpen(false);
      setEventName('');
      toast({ title: 'Yeniləndi', description: 'Təqvim tarixi uğurla yadda saxlanıldı' });
    }
  });

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    // Find if date already has event
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingEvent = calendar?.holidays?.find(h => h.date === dateStr);
    
    if (existingEvent) {
      setEventType(existingEvent.type);
      setEventName(existingEvent.name);
    } else {
      setEventType('holiday');
      setEventName('');
    }
    setIsModalOpen(true);
  };

  const handleSaveEvent = () => {
    if (!selectedDate || !calendar) return;
    
    toggleDateMutation.mutate({
      date: format(selectedDate, 'yyyy-MM-dd'),
      isSet: true,
      type: eventType,
      name: eventName || (eventType === 'holiday' ? 'Bayram' : eventType === 'vacation' ? 'Tətil' : 'Dərs olmayan gün')
    });
  };

  const handleRemoveEvent = () => {
    if (!selectedDate || !calendar) return;
    
    toggleDateMutation.mutate({
      date: format(selectedDate, 'yyyy-MM-dd'),
      isSet: false,
      type: eventType,
      name: ''
    });
  };

  const handleCreateInitialCalendar = () => {
    if (!activeYear) return;
    createCalendarMutation.mutate({
      academic_year_id: activeYear.id,
      institution_id: 1, // Central authority
      name: `${activeYear.name} Tədris Təqvimi`,
      calendar_type: 'school',
      start_date: activeYear.start_date,
      end_date: activeYear.end_date,
      status: 'active',
      is_default: true
    });
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>;

  if (!calendar && activeYear) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-semibold mb-2">Tədris Təqvimi tapılmadı</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {activeYear.name} təhsil ili üçün hələ təqvim yaradılmayıb. 
            Mərkəzi təqvim şablonunu yaratmaqla işə başlaya bilərsiniz.
          </p>
          <Button onClick={handleCreateInitialCalendar} disabled={createCalendarMutation.isPending}>
            {createCalendarMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Təqvim Yarat
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Define modifiers for the calendar
  const holidays = calendar?.holidays?.filter(h => h.type === 'holiday').map(h => parseISO(h.date)) || [];
  const vacations = calendar?.holidays?.filter(h => h.type === 'vacation').map(h => parseISO(h.date)) || [];
  const mourning = calendar?.holidays?.filter(h => h.type === 'mourning').map(h => parseISO(h.date)) || [];
  const nonTeaching = calendar?.holidays?.filter(h => h.type === 'non_teaching').map(h => parseISO(h.date)) || [];

  const modifiers = {
    holiday: holidays,
    vacation: vacations,
    mourning: mourning,
    non_teaching: nonTeaching
  };

  const modifiersStyles = {
    holiday: { color: 'white', backgroundColor: '#ef4444' }, // red-500
    vacation: { color: 'white', backgroundColor: '#3b82f6' }, // blue-500
    mourning: { color: 'white', backgroundColor: '#111827' }, // gray-900
    non_teaching: { color: 'inherit', backgroundColor: '#f3f4f6', border: '1px dashed #9ca3af' } // gray-100
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Calendar View */}
        <Card className="lg:col-span-1 shadow-sm border-none bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              Təqvim Görünüşü
            </CardTitle>
            <CardDescription>Günü seçərək statusunu dəyişin</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-0 pb-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              onDayClick={handleDayClick}
              locale={az}
              className="rounded-md border-none"
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
            />
          </CardContent>
        </Card>

        {/* Right: Legend and Info */}
        <Card className="lg:col-span-2 shadow-sm border-none bg-gradient-to-br from-slate-50 to-white">
          <CardHeader>
            <CardTitle className="text-lg">Təqvim Məlumatları</CardTitle>
            <CardDescription>{calendar?.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">İşarələr</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-red-500 shadow-sm" />
                    <span className="text-sm font-medium">Böyük Bayramlar / Qeyri-iş günləri</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-blue-500 shadow-sm" />
                    <span className="text-sm font-medium">Tədris tətilləri</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-gray-900 shadow-sm" />
                    <span className="text-sm font-medium">Milli matəm / Yas günləri</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-gray-100 border border-dashed border-gray-400" />
                    <span className="text-sm font-medium">Digər dərs olmayan günlər</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-700">Məlumat</h4>
                    <p className="text-xs text-blue-600 leading-relaxed mt-1">
                      Bu təqvim bütün ölkə üzrə tədris müəssisələri üçün baza rolunu oynayır. 
                      Burada edilən dəyişikliklər avtomatik olaraq bütün məktəblərin təqviminə təsir edir.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-sm font-semibold mb-3">Qeyd olunmuş günlər ({calendar?.holidays?.length || 0})</h4>
              <div className="flex flex-wrap gap-2">
                {calendar?.holidays?.sort((a,b) => a.date.localeCompare(b.date)).map((h, i) => (
                  <Badge 
                    key={i} 
                    variant="outline" 
                    className={`gap-1 pr-1 ${
                      h.type === 'holiday' ? 'bg-red-50 text-red-700 border-red-200' : 
                      h.type === 'vacation' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      h.type === 'mourning' ? 'bg-slate-100 text-slate-800 border-slate-300' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {format(parseISO(h.date), 'dd MMM', { locale: az })}: {h.name}
                  </Badge>
                ))}
                {(calendar?.holidays?.length === 0) && (
                  <span className="text-sm text-muted-foreground italic">Heç bir xüsusi gün qeyd edilməyib.</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tarixi İdarə Et</DialogTitle>
            <DialogDescription>
              {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: az }) : ''} tarixi üçün status seçin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Növ</Label>
              <Select 
                value={eventType} 
                onValueChange={(v: any) => setEventType(v)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Növü seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holiday">Bayram</SelectItem>
                  <SelectItem value="vacation">Tətil</SelectItem>
                  <SelectItem value="mourning">Yas Günü</SelectItem>
                  <SelectItem value="non_teaching">Dərs olmayan gün</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Ad</Label>
              <Input
                id="name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="məs: Novruz Bayramı"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between items-center sm:gap-2">
            <Button 
              variant="destructive" 
              onClick={handleRemoveEvent}
              disabled={toggleDateMutation.isPending || !calendar?.holidays?.find(h => h.date === (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''))}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Sıfırla
            </Button>
            <Button onClick={handleSaveEvent} disabled={toggleDateMutation.isPending}>
              {toggleDateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Yadda Saxla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
