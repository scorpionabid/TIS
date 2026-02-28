import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ManualScoreDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (score: number, category: string, reason: string) => void;
    currentScore: number;
    currentCategory?: string;
    currentReason?: string;
    directorName: string;
    saving?: boolean;
}

const POSITIVE_CATEGORIES = [
    { value: 'region_contribution', label: 'Region təhsilinə tövhə' },
    { value: 'sector_contribution', label: 'Rayon/Sektor təhsilinə tövhə' },
    { value: 'documents_ok', label: 'Məktəb sənədlərinin qaydasında olması' },
    { value: 'attendance_ok', label: 'Davamiyyətin qaydasında olması' },
    { value: 'teaching_quality_high', label: 'Tədrisin keyfiyyəti yüksək' },
    { value: 'parent_relations_good', label: 'Valideyinlərlə iş nümunəvi' },
    { value: 'digital_env_ok', label: 'Rəqəmsal mühit qurulub' },
    { value: 'monitoring_positive', label: 'Monitorinq nəticəsi müsbət' },
    { value: 'self_development', label: 'Özünütəhsil fəaliyyəti' },
    { value: 'teacher_management_good', label: 'Müəllim kollektivi ilə iş yaxşı' },
];

const NEGATIVE_CATEGORIES = [
    { value: 'documents_fail', label: 'Məktəb sənədlərinin qaydasında olmaması' },
    { value: 'attendance_fail', label: 'Davamiyyətin qaydasında olmaması' },
    { value: 'teaching_quality_low', label: 'Tədrisin keyfiyyəti aşağı' },
    { value: 'parent_relations_weak', label: 'Valideyinlərlə iş zəif' },
    { value: 'digital_env_fail', label: 'Rəqəmsal mühit qurulmayıb' },
    { value: 'monitoring_negative', label: 'Monitorinq zamanı nöqsanlar aşkar edilib' },
    { value: 'teacher_management_weak', label: 'Müəllim kollektivi ilə iş zəif' },
    { value: 'admin_violations', label: 'İnzibati nöqsanlar' },
];

const isPositiveCategory = (cat: string) =>
    POSITIVE_CATEGORIES.some((c) => c.value === cat);

const isNegativeCategory = (cat: string) =>
    NEGATIVE_CATEGORIES.some((c) => c.value === cat);

export const ManualScoreDialog: React.FC<ManualScoreDialogProps> = ({
    isOpen,
    onClose,
    onSave,
    currentScore,
    currentCategory = '',
    currentReason = '',
    directorName,
    saving = false,
}) => {
    const [category, setCategory] = useState(currentCategory);
    const [scoreAbs, setScoreAbs] = useState(Math.abs(currentScore) || 1);
    const [reason, setReason] = useState(currentReason);

    // Reset state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setCategory(currentCategory);
            setScoreAbs(Math.abs(currentScore) || 1);
            setReason(currentReason);
        }
    }, [isOpen, currentCategory, currentScore, currentReason]);

    // When category changes, ensure scoreAbs sign stays consistent
    const handleCategoryChange = (val: string) => {
        setCategory(val);
        // Keep abs value, sign is determined by category on save
    };

    const handleScoreInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Math.abs(parseInt(e.target.value) || 0);
        setScoreAbs(Math.min(100, Math.max(1, val)));
    };

    const isPositive = category ? isPositiveCategory(category) : true;
    const finalScore = category
        ? isPositiveCategory(category)
            ? scoreAbs
            : -scoreAbs
        : scoreAbs;

    const canSave = category.trim() !== '';

    const handleSave = () => {
        if (!canSave) return;
        onSave(finalScore, category, reason);
    };

    const allCategories = [...POSITIVE_CATEGORIES, ...NEGATIVE_CATEGORIES];
    const categoryLabel = allCategories.find((c) => c.value === category)?.label ?? '';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <span className="text-gray-500 font-normal">Manual Bal —</span>
                        <span className="font-semibold text-gray-900">{directorName}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Category select */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">
                            Kateqoriya <span className="text-red-500">*</span>
                        </Label>
                        <Select value={category} onValueChange={handleCategoryChange}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Kateqoriya seçin..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel className="flex items-center gap-1.5 text-green-700 font-semibold">
                                        <TrendingUp className="h-3.5 w-3.5" />
                                        Müsbət (+bal)
                                    </SelectLabel>
                                    {POSITIVE_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                                <SelectGroup>
                                    <SelectLabel className="flex items-center gap-1.5 text-red-700 font-semibold mt-1">
                                        <TrendingDown className="h-3.5 w-3.5" />
                                        Mənfi (-bal)
                                    </SelectLabel>
                                    {NEGATIVE_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Score input */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">Bal miqdarı</Label>
                        <div className="flex items-center gap-3">
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold text-lg select-none ${
                                    category
                                        ? isPositive
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                        : 'bg-gray-100 text-gray-500'
                                }`}
                            >
                                {category ? (isPositive ? '+' : '−') : '±'}
                            </div>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={scoreAbs}
                                onChange={handleScoreInput}
                                className="w-24 text-center border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            {category && (
                                <span
                                    className={`text-sm font-semibold ${
                                        isPositive ? 'text-green-600' : 'text-red-600'
                                    }`}
                                >
                                    Nəticə: {isPositive ? '+' : ''}{finalScore}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Kateqoriyaya görə işarə avtomatik müəyyən edilir (1–100)
                        </p>
                    </div>

                    {/* Reason textarea */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">
                            Əlavə qeyd{' '}
                            <span className="text-xs font-normal text-muted-foreground">(istəyə bağlı)</span>
                        </Label>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value.slice(0, 500))}
                            placeholder="Balın verilmə səbəbi, xüsusi qeydlər..."
                            className="resize-none text-sm"
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {reason.length}/500
                        </p>
                    </div>

                    {/* Preview row */}
                    {category && (
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-sm space-y-1">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Kateqoriya:</span>
                                <span className="font-medium text-gray-800">{categoryLabel}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Bal:</span>
                                <span
                                    className={`font-bold ${
                                        isPositive ? 'text-green-700' : 'text-red-700'
                                    }`}
                                >
                                    {isPositive ? '+' : ''}{finalScore}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Ləğv et
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!canSave || saving}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {saving ? 'Saxlanılır...' : 'Yadda saxla'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
