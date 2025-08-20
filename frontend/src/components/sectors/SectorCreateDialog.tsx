import { useState } from "react";
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
import { SectorCreateData } from "@/services/sectors";
import { useToast } from "@/hooks/use-toast";

interface SectorCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SectorCreateData) => void;
  isCreating: boolean;
}

export const SectorCreateDialog = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isCreating 
}: SectorCreateDialogProps) => {
  const [newSector, setNewSector] = useState<SectorCreateData>({
    name: '',
    code: '',
    description: '',
    parent_id: 0,
    address: '',
    phone: '',
    email: '',
    is_active: true
  });

  const { toast } = useToast();

  const handleSubmit = () => {
    if (!newSector.name.trim() || newSector.parent_id === 0) {
      toast({
        title: "Xəta",
        description: "Sektor adı və region məcburidir.",
        variant: "destructive",
      });
      return;
    }
    onSubmit(newSector);
  };

  const handleClose = () => {
    setNewSector({
      name: '',
      code: '',
      description: '',
      parent_id: 0,
      address: '',
      phone: '',
      email: '',
      is_active: true
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Yeni Sektor Yaradın</DialogTitle>
          <DialogDescription>
            Yeni sektor məlumatlarını daxil edin
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Sektor Adı *</Label>
            <Input
              id="name"
              value={newSector.name}
              onChange={(e) => setNewSector(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Məs: Orta təhsil sektoru"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Sektor Kodu *</Label>
            <Input
              id="code"
              value={newSector.code}
              onChange={(e) => setNewSector(prev => ({ ...prev, code: e.target.value }))}
              placeholder="Məs: OTS-BAK-001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select value={newSector.parent_id.toString()} onValueChange={(value) => setNewSector(prev => ({ ...prev, parent_id: parseInt(value) }))}>
              <SelectTrigger>
                <SelectValue placeholder="Region seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">Bakı Şəhər Təhsil İdarəsi</SelectItem>
                <SelectItem value="3">Gəncə Şəhər Təhsil İdarəsi</SelectItem>
                <SelectItem value="4">Şəki Rayon Təhsil İdarəsi</SelectItem>
                <SelectItem value="5">Şamaxı Rayon Təhsil İdarəsi</SelectItem>
                <SelectItem value="6">Quba Rayon Təhsil İdarəsi</SelectItem>
                <SelectItem value="30">LARTİ Regional Təhsil İdarəsi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="description">Təsvir</Label>
            <Textarea
              id="description"
              value={newSector.description}
              onChange={(e) => setNewSector(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Sektorun ətraflı təsviri..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              value={newSector.phone}
              onChange={(e) => setNewSector(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+994 XX XXX-XXXX"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={newSector.email}
              onChange={(e) => setNewSector(prev => ({ ...prev, email: e.target.value }))}
              placeholder="sektor@edu.az"
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="address">Ünvan</Label>
            <Input
              id="address"
              value={newSector.address}
              onChange={(e) => setNewSector(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Sektor ünvanı..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Ləğv et
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isCreating || !newSector.name.trim() || newSector.parent_id === 0}
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