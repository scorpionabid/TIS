import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Calculator, Save, Trash2, Download, Users } from 'lucide-react';

interface RatingActionToolbarProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onCalculateAll: () => void;
    onBulkSave: () => void;
    onBulkDelete: () => void;
    onExport: () => void;
    selectedCount: number;
    loading?: boolean;
}

export const RatingActionToolbar: React.FC<RatingActionToolbarProps> = ({
    searchTerm,
    onSearchChange,
    onCalculateAll,
    onBulkSave,
    onBulkDelete,
    onExport,
    selectedCount,
    loading
}) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                    placeholder="Direktor və ya müəssisə axtar..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10 h-10 border-gray-200 focus:ring-blue-500"
                />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Button
                    onClick={onCalculateAll}
                    variant="default"
                    size="sm"
                    className="h-10 bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                >
                    <Calculator className="h-4 w-4 mr-2" />
                    Hamısını Hesabla
                </Button>

                {selectedCount > 0 && (
                    <>
                        <Button
                            onClick={onBulkSave}
                            variant="outline"
                            size="sm"
                            className="h-10 border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Yadda Saxla ({selectedCount})
                        </Button>

                        <Button
                            onClick={onBulkDelete}
                            variant="destructive"
                            size="sm"
                            className="h-10"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Sil ({selectedCount})
                        </Button>
                    </>
                )}

                <div className="h-6 w-px bg-gray-200 mx-1 hidden md:block" />

                <Button
                    onClick={onExport}
                    variant="outline"
                    size="sm"
                    className="h-10 border-gray-200"
                >
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                </Button>
            </div>
        </div>
    );
};
