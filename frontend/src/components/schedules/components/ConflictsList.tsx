import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  Clock, 
  Users, 
  BookOpen,
  MapPin,
  Filter,
  Search,
  X,
  RefreshCw
} from 'lucide-react';

interface Conflict {
  id: string;
  type: 'teacher_conflict' | 'room_conflict' | 'class_conflict' | 'time_constraint' | 'workload_violation';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  affected_sessions: {
    id: number;
    period_number: number;
    day_of_week: number;
    teacher: { id: number; name: string; };
    subject: { id: number; name: string; };
    class: { id: number; name: string; };
    room?: { id: number; name: string; };
    time: string;
  }[];
  suggestions: {
    id: string;
    description: string;
    action_type: 'reschedule' | 'reassign_room' | 'reassign_teacher' | 'split_session';
    impact: 'minimal' | 'moderate' | 'significant';
  }[];
  auto_resolvable: boolean;
  resolved: boolean;
}

interface ConflictsListProps {
  conflicts: Conflict[];
  onResolve: (conflict: Conflict) => void;
}

type ConflictFilter = 'all' | 'critical' | 'warning' | 'info' | 'resolved' | 'unresolved';
type ConflictType = 'all' | 'teacher_conflict' | 'room_conflict' | 'class_conflict' | 'time_constraint' | 'workload_violation';

export const ConflictsList: React.FC<ConflictsListProps> = ({
  conflicts,
  onResolve
}) => {
  const [selectedFilter, setSelectedFilter] = useState<ConflictFilter>('all');
  const [selectedType, setSelectedType] = useState<ConflictType>('all');
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock conflicts if none provided
  const mockConflicts: Conflict[] = [
    {
      id: '1',
      type: 'teacher_conflict',
      severity: 'critical',
      title: 'Müəllim konflikti',
      description: 'Mahmud Əliyev eyni vaxtda iki fərqli sinifdə dərs aparmalıdır',
      affected_sessions: [
        {
          id: 1,
          period_number: 3,
          day_of_week: 1,
          teacher: { id: 1, name: 'Mahmud Əliyev' },
          subject: { id: 1, name: 'Riyaziyyat' },
          class: { id: 1, name: '9-A' },
          room: { id: 1, name: '201' },
          time: '10:00-10:45'
        },
        {
          id: 2,
          period_number: 3,
          day_of_week: 1,
          teacher: { id: 1, name: 'Mahmud Əliyev' },
          subject: { id: 1, name: 'Riyaziyyat' },
          class: { id: 2, name: '10-B' },
          room: { id: 2, name: '301' },
          time: '10:00-10:45'
        }
      ],
      suggestions: [
        {
          id: 's1',
          description: '10-B sinifinin dərsini 4-cü dərsə keçirin',
          action_type: 'reschedule',
          impact: 'minimal'
        },
        {
          id: 's2',
          description: 'Digər müəllim təyin edin',
          action_type: 'reassign_teacher',
          impact: 'moderate'
        }
      ],
      auto_resolvable: true,
      resolved: false
    },
    {
      id: '2',
      type: 'room_conflict',
      severity: 'warning',
      title: 'Otaq konflikti',
      description: '201 nömrəli otaq eyni vaxtda iki dərsin keçirilməsi üçün təyin edilib',
      affected_sessions: [
        {
          id: 3,
          period_number: 2,
          day_of_week: 2,
          teacher: { id: 2, name: 'Leyla Həsənova' },
          subject: { id: 2, name: 'Azərbaycan dili' },
          class: { id: 3, name: '8-A' },
          room: { id: 1, name: '201' },
          time: '09:00-09:45'
        },
        {
          id: 4,
          period_number: 2,
          day_of_week: 2,
          teacher: { id: 3, name: 'Rəşad Quliyev' },
          subject: { id: 3, name: 'Tarix' },
          class: { id: 4, name: '11-C' },
          room: { id: 1, name: '201' },
          time: '09:00-09:45'
        }
      ],
      suggestions: [
        {
          id: 's3',
          description: 'Tarix dərsini 102 nömrəli otağa keçirin',
          action_type: 'reassign_room',
          impact: 'minimal'
        }
      ],
      auto_resolvable: true,
      resolved: false
    },
    {
      id: '3',
      type: 'workload_violation',
      severity: 'info',
      title: 'Dərs yükü aşılması',
      description: 'Fatimə Məmmədova həftəlik 26 saat dərs yükü alıb (maksimum 25)',
      affected_sessions: [
        {
          id: 5,
          period_number: 7,
          day_of_week: 5,
          teacher: { id: 4, name: 'Fatimə Məmmədova' },
          subject: { id: 4, name: 'İngilis dili' },
          class: { id: 5, name: '9-C' },
          time: '14:00-14:45'
        }
      ],
      suggestions: [
        {
          id: 's4',
          description: 'Əlavə dərsi digər müəllimə tapşırın',
          action_type: 'reassign_teacher',
          impact: 'moderate'
        }
      ],
      auto_resolvable: false,
      resolved: false
    }
  ];

  const allConflicts = conflicts.length > 0 ? conflicts : mockConflicts;

  const filteredConflicts = useMemo(() => {
    return allConflicts.filter(conflict => {
      // Severity filter
      if (selectedFilter !== 'all') {
        if (selectedFilter === 'resolved' && !conflict.resolved) return false;
        if (selectedFilter === 'unresolved' && conflict.resolved) return false;
        if (selectedFilter !== 'resolved' && selectedFilter !== 'unresolved' && conflict.severity !== selectedFilter) return false;
      }

      // Type filter
      if (selectedType !== 'all' && conflict.type !== selectedType) return false;

      // Search filter
      if (searchTerm && !conflict.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !conflict.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      return true;
    });
  }, [allConflicts, selectedFilter, selectedType, searchTerm]);

  const getConflictIcon = (type: Conflict['type']) => {
    switch (type) {
      case 'teacher_conflict': return Users;
      case 'room_conflict': return MapPin;
      case 'class_conflict': return BookOpen;
      case 'time_constraint': return Clock;
      case 'workload_violation': return AlertTriangle;
      default: return AlertCircle;
    }
  };

  const getConflictColor = (severity: Conflict['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityBadgeColor = (severity: Conflict['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'minimal': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'significant': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getDayName = (day: number) => {
    const days = ['', 'Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə', 'Bazar'];
    return days[day] || day.toString();
  };

  const conflictStats = useMemo(() => {
    const stats = {
      total: allConflicts.length,
      critical: allConflicts.filter(c => c.severity === 'critical').length,
      warning: allConflicts.filter(c => c.severity === 'warning').length,
      info: allConflicts.filter(c => c.severity === 'info').length,
      resolved: allConflicts.filter(c => c.resolved).length,
      auto_resolvable: allConflicts.filter(c => c.auto_resolvable && !c.resolved).length
    };
    return stats;
  }, [allConflicts]);

  const handleResolveConflict = (conflict: Conflict) => {
    onResolve(conflict);
  };

  if (allConflicts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Konflikt tapılmadı
            </h3>
            <p className="text-gray-600">
              Cədvəldə heç bir konflikt və ya problem aşkarlanmadı
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Konfliktlər və Problemlər</h3>
          <p className="text-gray-600 text-sm">
            Cədvəldə aşkarlanan problemləri nəzərdən keçirin və həll edin
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Yenidən yoxla
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold">{conflictStats.total}</div>
            <div className="text-xs text-gray-600">Cəmi</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-red-600">{conflictStats.critical}</div>
            <div className="text-xs text-gray-600">Kritik</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-yellow-600">{conflictStats.warning}</div>
            <div className="text-xs text-gray-600">Xəbərdarlıq</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-blue-600">{conflictStats.info}</div>
            <div className="text-xs text-gray-600">Məlumat</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-green-600">{conflictStats.resolved}</div>
            <div className="text-xs text-gray-600">Həll edilmiş</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-purple-600">{conflictStats.auto_resolvable}</div>
            <div className="text-xs text-gray-600">Avtomatik həll</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Filtr:</span>
            </div>
            
            <div className="flex gap-1">
              {(['all', 'critical', 'warning', 'info', 'resolved'] as ConflictFilter[]).map((filter) => (
                <Button
                  key={filter}
                  variant={selectedFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFilter(filter)}
                >
                  {filter === 'all' && 'Hamısı'}
                  {filter === 'critical' && 'Kritik'}
                  {filter === 'warning' && 'Xəbərdarlıq'}
                  {filter === 'info' && 'Məlumat'}
                  {filter === 'resolved' && 'Həll edilmiş'}
                </Button>
              ))}
            </div>

            <div className="flex-1 max-w-xs relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Konflikt axtarın..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conflicts List */}
      <div className="space-y-4">
        {filteredConflicts.map((conflict) => {
          const ConflictIcon = getConflictIcon(conflict.type);
          const isExpanded = expandedConflict === conflict.id;
          
          return (
            <Card key={conflict.id} className={`border ${conflict.resolved ? 'bg-green-50/50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${getConflictColor(conflict.severity)}`}>
                    <ConflictIcon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">{conflict.title}</h4>
                      <Badge className={getSeverityBadgeColor(conflict.severity)}>
                        {conflict.severity === 'critical' && 'Kritik'}
                        {conflict.severity === 'warning' && 'Xəbərdarlıq'}
                        {conflict.severity === 'info' && 'Məlumat'}
                      </Badge>
                      
                      {conflict.auto_resolvable && !conflict.resolved && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          Avtomatik həll
                        </Badge>
                      )}
                      
                      {conflict.resolved && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Həll edildi
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3">{conflict.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {conflict.affected_sessions.length} dərs təsir altındadır
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedConflict(isExpanded ? null : conflict.id)}
                        >
                          {isExpanded ? 'Gizlə' : 'Təfərrüatlı'}
                        </Button>
                        
                        {!conflict.resolved && (
                          <Button
                            size="sm"
                            onClick={() => handleResolveConflict(conflict)}
                            variant={conflict.auto_resolvable ? "default" : "outline"}
                          >
                            {conflict.auto_resolvable ? 'Avtomatik həll et' : 'Həll et'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-4 pl-14 space-y-4">
                    {/* Affected Sessions */}
                    <div>
                      <h5 className="font-medium text-sm mb-2">Təsir altındakı dərslər:</h5>
                      <div className="space-y-2">
                        {conflict.affected_sessions.map((session) => (
                          <div key={session.id} className="bg-gray-50 p-3 rounded-lg text-sm">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="font-medium">{session.subject.name} - {session.class.name}</div>
                                <div className="text-gray-600">{session.teacher.name}</div>
                                <div className="text-gray-500">
                                  {getDayName(session.day_of_week)} - {session.period_number}-ci dərs ({session.time})
                                  {session.room && ` - ${session.room.name}`}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Suggestions */}
                    {conflict.suggestions.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Həll təklifləri:</h5>
                        <div className="space-y-2">
                          {conflict.suggestions.map((suggestion) => (
                            <div key={suggestion.id} className="bg-blue-50 p-3 rounded-lg text-sm">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-gray-900">{suggestion.description}</div>
                                  <div className={`text-xs mt-1 font-medium ${getImpactColor(suggestion.impact)}`}>
                                    Təsir: {suggestion.impact === 'minimal' && 'Minimal'}
                                    {suggestion.impact === 'moderate' && 'Orta'}
                                    {suggestion.impact === 'significant' && 'Əhəmiyyətli'}
                                  </div>
                                </div>
                                <Button size="sm" variant="outline">
                                  Tətbiq et
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {filteredConflicts.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <div className="text-gray-600">Seçilən filterlərə uyğun konflikt tapılmadı</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};