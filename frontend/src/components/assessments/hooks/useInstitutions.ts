import { useState, useEffect } from 'react';
import { institutionService } from '@/services/institutions';
import { assessmentTypeService } from '@/services/assessmentTypes';
import { useToast } from '@/hooks/use-toast';

interface Institution {
  id: number;
  name: string;
  type: string;
  level: number;
  district?: string;
  region?: string;
  student_count?: number;
  is_active: boolean;
}

interface UseInstitutionsProps {
  isOpen: boolean;
  assessmentTypeId?: number;
  mode: 'basic' | 'enhanced';
}

export function useInstitutions({ isOpen, assessmentTypeId, mode }: UseInstitutionsProps) {
  const { toast } = useToast();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitutions, setSelectedInstitutions] = useState<number[]>([]);
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  // Load institutions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadInstitutions();
    }
  }, [isOpen, institutionSearch]);

  // Load assigned institutions for enhanced mode
  useEffect(() => {
    if (mode === 'enhanced' && assessmentTypeId) {
      loadAssignedInstitutions(assessmentTypeId);
    }
  }, [assessmentTypeId, mode]);

  const loadInstitutions = async () => {
    setLoadingInstitutions(true);
    try {
      const response = await institutionService.getInstitutions({ 
        per_page: 1000,
        search: institutionSearch || undefined
      });
      setInstitutions(response.data || []);
    } catch (error) {
      console.error('Failed to load institutions:', error);
      toast({
        title: 'Xəta',
        description: 'Müəssisələr yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setLoadingInstitutions(false);
    }
  };

  const loadAssignedInstitutions = async (assessmentTypeId: number) => {
    try {
      const assigned = await assessmentTypeService.getAssignedInstitutions(assessmentTypeId);
      setSelectedInstitutions(assigned.map((inst: any) => inst.id));
    } catch (error) {
      console.error('Failed to load assigned institutions:', error);
    }
  };

  const toggleInstitution = (institutionId: number) => {
    setSelectedInstitutions(prev => 
      prev.includes(institutionId)
        ? prev.filter(id => id !== institutionId)
        : [...prev, institutionId]
    );
  };

  const selectAllFilteredInstitutions = () => {
    const filteredIds = getFilteredInstitutions().map(inst => inst.id);
    setSelectedInstitutions(prev => {
      const newSelected = [...new Set([...prev, ...filteredIds])];
      return newSelected;
    });
  };

  const deselectAllFilteredInstitutions = () => {
    const filteredIds = getFilteredInstitutions().map(inst => inst.id);
    setSelectedInstitutions(prev => prev.filter(id => !filteredIds.includes(id)));
  };

  const getFilteredInstitutions = () => {
    return institutions.filter(institution => 
      institution.name.toLowerCase().includes(institutionSearch.toLowerCase()) ||
      institution.type.toLowerCase().includes(institutionSearch.toLowerCase()) ||
      institution.district?.toLowerCase().includes(institutionSearch.toLowerCase()) ||
      institution.region?.toLowerCase().includes(institutionSearch.toLowerCase())
    );
  };

  const getInstitutionStats = () => {
    const filtered = getFilteredInstitutions();
    return {
      total: institutions.length,
      filtered: filtered.length,
      selected: selectedInstitutions.length,
      selectedFromFiltered: filtered.filter(inst => selectedInstitutions.includes(inst.id)).length,
    };
  };

  return {
    institutions,
    selectedInstitutions,
    setSelectedInstitutions,
    institutionSearch,
    setInstitutionSearch,
    loadingInstitutions,
    toggleInstitution,
    selectAllFilteredInstitutions,
    deselectAllFilteredInstitutions,
    getFilteredInstitutions,
    getInstitutionStats,
    loadInstitutions,
  };
}