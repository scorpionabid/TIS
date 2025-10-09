import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Alert, AlertDescription } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { AlertTriangle, Building2, School, ChevronDown, ChevronRight } from 'lucide-react';

interface InstitutionNode {
  id: number;
  name: string;
  type: string;
  level: number;
  total_responses: number;
  completed_responses: number;
  completion_rate: number;
  targeted_users: number;
  response_rate: number;
  total_schools?: number;
  responded_schools?: number;
  children?: InstitutionNode[];
}

interface NonRespondingInstitutionsProps {
  hierarchyData: {
    hierarchy_type: string;
    nodes: InstitutionNode[];
  } | undefined;
  isLoading: boolean;
}

const NonRespondingInstitutions: React.FC<NonRespondingInstitutionsProps> = ({
  hierarchyData,
  isLoading
}) => {
  const [expandedSectors, setExpandedSectors] = React.useState<Set<number>>(new Set());

  // Extract non-responding institutions from hierarchy
  const nonRespondingData = useMemo(() => {
    if (!hierarchyData?.nodes) {
      return { sectors: [], totalNonResponding: 0 };
    }

    const sectors: Array<{
      id: number;
      name: string;
      nonRespondingSchools: InstitutionNode[];
    }> = [];

    let totalNonResponding = 0;

    hierarchyData.nodes.forEach((node) => {
      // hierarchy_type determines structure:
      // - "sectors_schools": nodes are sectors (level 3), children are schools (level 4)
      // - "regions_sectors_schools": nodes are regions (level 2), children are sectors (level 3), grandchildren are schools (level 4)

      if (hierarchyData.hierarchy_type === 'sectors_schools') {
        // Direct sector → schools structure (RegionAdmin view)
        if (node.level === 3 && node.children) {
          // These children are SCHOOLS, not sectors!
          const nonRespondingSchools = node.children.filter(
            school => school.total_responses === 0
          );

          if (nonRespondingSchools.length > 0) {
            sectors.push({
              id: node.id,
              name: node.name,
              nonRespondingSchools
            });
            totalNonResponding += nonRespondingSchools.length;
          }
        }
      } else if (hierarchyData.hierarchy_type === 'regions_sectors_schools') {
        // Region → Sector → Schools structure (SuperAdmin view)
        if (node.level === 2 && node.children) {
          node.children.forEach((sector) => {
            if (sector.children && sector.children.length > 0) {
              const nonRespondingSchools = sector.children.filter(
                school => school.total_responses === 0
              );

              if (nonRespondingSchools.length > 0) {
                sectors.push({
                  id: sector.id,
                  name: sector.name,
                  nonRespondingSchools
                });
                totalNonResponding += nonRespondingSchools.length;
              }
            }
          });
        }
      }
    });

    return { sectors, totalNonResponding };
  }, [hierarchyData]);

  const toggleSector = (sectorId: number) => {
    const newExpanded = new Set(expandedSectors);
    if (newExpanded.has(sectorId)) {
      newExpanded.delete(sectorId);
    } else {
      newExpanded.add(sectorId);
    }
    setExpandedSectors(newExpanded);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Cavab Verməyən Müəssisələr
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (nonRespondingData.totalNonResponding === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-green-500" />
            Cavab Verməyən Müəssisələr
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <School className="h-12 w-12 mb-3 opacity-50 text-green-500" />
            <p className="text-sm font-medium text-green-600">Əla! Bütün müəssisələr cavab verib</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base mb-1">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Cavab Verməyən Müəssisələr
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Sorğuda heç cavab verməyən müəssisələr
            </p>
          </div>
          <Badge variant="destructive" className="text-base px-3 py-1">
            {nonRespondingData.totalNonResponding}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Alert */}
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{nonRespondingData.totalNonResponding} müəssisə</strong> sorğuda heç cavab verməyib
          </AlertDescription>
        </Alert>

        {/* Sectors with non-responding schools */}
        <div className="space-y-3">
          {nonRespondingData.sectors.map(sector => {
            const isExpanded = expandedSectors.has(sector.id);

            return (
              <div key={sector.id} className="border rounded-lg overflow-hidden">
                {/* Sector Header */}
                <button
                  onClick={() => toggleSector(sector.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div className="text-left">
                      <p className="font-medium text-sm">{sector.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sector.nonRespondingSchools.length} məktəb cavab verməyib
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                    {sector.nonRespondingSchools.length}
                  </Badge>
                </button>

                {/* Schools List */}
                {isExpanded && (
                  <div className="border-t bg-muted/20">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr className="text-xs">
                          <th className="text-left p-3 font-semibold">Məktəb</th>
                          <th className="text-center p-3 font-semibold">Hədəflənən İstifadəçi</th>
                          <th className="text-center p-3 font-semibold">Cavab</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sector.nonRespondingSchools.map(school => (
                          <tr key={school.id} className="border-t hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <School className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{school.name}</p>
                                  <p className="text-xs text-muted-foreground">{school.type}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center text-sm font-semibold">
                              {school.targeted_users}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="destructive">0 cavab</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg text-xs">
          <p className="text-muted-foreground">
            <strong>Qeyd:</strong> Bu siyahıda yalnız heç cavab verməyən müəssisələr göstərilir.
            Qismən cavab verənləri görmək üçün yuxarıdakı "Hierarxik Analiz" bölməsinə baxın.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(NonRespondingInstitutions);
