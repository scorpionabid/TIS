import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { SectorTaskCreateData } from "@/services/sectors";

interface SectorTaskCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sectorName: string;
  newTask: SectorTaskCreateData;
  setNewTask: (task: SectorTaskCreateData) => void;
  onSubmit: () => void;
  isCreating: boolean;
}

export const SectorTaskCreateDialog = ({
  isOpen,
  onClose,
  sectorName,
  newTask,
  setNewTask,
  onSubmit,
  isCreating
}: SectorTaskCreateDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Yeni Tapşırıq Yaradın</DialogTitle>
          <DialogDescription>
            {sectorName} üçün yeni tapşırıq yaradın
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Tapşırıq Başlığı *</Label>
            <Input
              id="task-title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="Tapşırıq başlığını daxil edin"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">Təsvir</Label>
            <Textarea
              id="task-description"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Tapşırıq təsvirini daxil edin"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-category">Kateqoriya</Label>
              <Select value={newTask.category} onValueChange={(value: any) => setNewTask({ ...newTask, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="report">Hesabat Hazırlığı</SelectItem>
                  <SelectItem value="maintenance">Təmir və İnfrastruktur</SelectItem>
                  <SelectItem value="event">Tədbir Təşkili</SelectItem>
                  <SelectItem value="audit">Audit və Nəzarət</SelectItem>
                  <SelectItem value="instruction">Təlimat və Metodik</SelectItem>
                  <SelectItem value="other">Digər</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-priority">Prioritet</Label>
              <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Aşağı</SelectItem>
                  <SelectItem value="medium">Orta</SelectItem>
                  <SelectItem value="high">Yüksək</SelectItem>
                  <SelectItem value="urgent">Təcili</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-deadline">Son Tarix</Label>
            <Input
              id="task-deadline"
              type="datetime-local"
              value={newTask.deadline}
              onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-scope">Məkan</Label>
            <Select value={newTask.target_scope} onValueChange={(value: any) => setNewTask({ ...newTask, target_scope: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sectoral">Bu sektor</SelectItem>
                <SelectItem value="specific">Xüsusi seçim</SelectItem>
                <SelectItem value="regional">Regional</SelectItem>
                <SelectItem value="all">Hamısı</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Ləğv et
          </Button>
          <Button 
            onClick={onSubmit}
            disabled={isCreating || !newTask.title.trim()}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Yarat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};