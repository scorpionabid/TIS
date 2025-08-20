import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Calendar, Clock, Bell } from 'lucide-react';

interface SchedulingTabProps {
  dueDate: string;
  setDueDate: (date: string) => void;
  isRecurring: boolean;
  setIsRecurring: (recurring: boolean) => void;
  recurringFrequency: string;
  setRecurringFrequency: (frequency: string) => void;
  notificationDays: number;
  setNotificationDays: (days: number) => void;
}

export const SchedulingTab = ({
  dueDate,
  setDueDate,
  isRecurring,
  setIsRecurring,
  recurringFrequency,
  setRecurringFrequency,
  notificationDays,
  setNotificationDays
}: SchedulingTabProps) => {
  return (
    <div className="space-y-6">
      {/* Due Date */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Son Tarix
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="due_date">Son Tarix və Vaxt</Label>
            <Input
              id="due_date"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Qiymətləndirmənin tamamlanması üçün son tarix
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recurring Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Təkrar Cədvəl
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_recurring"
              checked={isRecurring}
              onCheckedChange={(checked) => setIsRecurring(!!checked)}
            />
            <Label htmlFor="is_recurring">Bu qiymətləndirməni müntəzəm təkrar et</Label>
          </div>

          {isRecurring && (
            <div className="space-y-4 ml-6">
              <div className="space-y-2">
                <Label htmlFor="recurring_frequency">Təkrar Tezliyi</Label>
                <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Həftəlik</SelectItem>
                    <SelectItem value="monthly">Aylıq</SelectItem>
                    <SelectItem value="quarterly">Rüblük</SelectItem>
                    <SelectItem value="semesterly">Semestr</SelectItem>
                    <SelectItem value="yearly">İllik</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Qeyd:</strong> Təkrar qiymətləndirmələr avtomatik olaraq sistem tərəfindən yaradılacaq.
                  Hər yeni qiymətləndirmə öncəkindən sonra planlaşdırılacaq.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Bildirişlər
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notification_days">Son tarixdan neçə gün əvvəl xatırlatma göndər</Label>
            <div className="flex items-center gap-2">
              <Input
                id="notification_days"
                type="number"
                value={notificationDays}
                onChange={(e) => setNotificationDays(parseInt(e.target.value) || 7)}
                min="1"
                max="30"
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">gün əvvəl</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Bu müddət ərzində müvafiq məsul şəxslərə bildiriş göndəriləcək
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Bildiriş Növləri:</h4>
            <div className="space-y-2 ml-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="email_notification" defaultChecked />
                <Label htmlFor="email_notification">Email bildirişi</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="system_notification" defaultChecked />
                <Label htmlFor="system_notification">Sistem bildirişi</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="sms_notification" />
                <Label htmlFor="sms_notification">SMS bildirişi</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};