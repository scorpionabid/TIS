import React, { useMemo } from 'react';
import { ChevronRight, Building, MapPin, Users, School } from 'lucide-react';
import { InstitutionType, Institution } from '@/services/institutions';
import { getTypeLabel } from '@/utils/institutionUtils';
import { cn } from '@/lib/utils';

interface HierarchyPathProps {
  selectedType?: string;
  parentId?: string | number;
  institutionTypes: InstitutionType[];
  institutions?: Institution[];
  currentName?: string;
  className?: string;
}

interface PathItem {
  type: string;
  level: number;
  name?: string;
  id?: number;
  isCurrentSelection?: boolean;
}

/**
 * Get appropriate icon for institution level/type
 */
const getLevelIcon = (level: number, typeKey?: string) => {
  switch (level) {
    case 1:
      return <Building className="h-4 w-4" />;
    case 2:
      return <MapPin className="h-4 w-4" />;
    case 3:
      return <Users className="h-4 w-4" />;
    case 4:
    default:
      return <School className="h-4 w-4" />;
  }
};

/**
 * Get color scheme for different levels
 */
const getLevelColors = (level: number, isCurrentSelection = false) => {
  const baseClasses = isCurrentSelection ? 
    'bg-blue-100 text-blue-800 border-blue-300 ring-2 ring-blue-500 ring-opacity-20' : 
    'bg-white text-gray-700 border-gray-200';
  
  const levelClasses = {
    1: 'border-l-4 border-l-gray-600',
    2: 'border-l-4 border-l-blue-500', 
    3: 'border-l-4 border-l-green-500',
    4: 'border-l-4 border-l-orange-500',
  }[level] || 'border-l-4 border-l-gray-400';
  
  return `${baseClasses} ${levelClasses}`;
};

/**
 * HierarchyPath component shows the institutional hierarchy path
 * from ministry level down to the current selection
 */
export const HierarchyPath: React.FC<HierarchyPathProps> = ({
  selectedType,
  parentId,
  institutionTypes,
  institutions = [],
  currentName,
  className,
}) => {
  const hierarchyPath = useMemo(() => {
    if (!selectedType || institutionTypes.length === 0) {
      return [];
    }

    const buildPath = (typeKey: string, instId?: string | number, name?: string): PathItem[] => {
      const typeData = institutionTypes.find(t => t.key === typeKey);
      if (!typeData) return [];

      const path: PathItem[] = [];
      
      // If we have a parent, recursively build the parent path
      if (instId && institutions.length > 0) {
        const institution = institutions.find(i => i.id.toString() === instId.toString());
        if (institution && institution.parent) {
          const parentType = typeof institution.parent.type === 'object' ? 
            institution.parent.type.key : 
            institution.parent.type;
          path.push(...buildPath(parentType, institution.parent.parent_id, institution.parent.name));
          path.push({
            type: parentType,
            level: institution.parent.level,
            name: institution.parent.name,
            id: institution.parent.id,
          });
        }
      } else if (typeData.default_level > 1) {
        // Build theoretical path based on levels
        for (let level = 1; level < typeData.default_level; level++) {
          const parentType = institutionTypes.find(t => t.default_level === level);
          if (parentType) {
            path.push({
              type: parentType.key,
              level: parentType.default_level,
              name: getTypeLabel(parentType.key),
            });
          }
        }
      }

      // Add current selection
      path.push({
        type: typeKey,
        level: typeData.default_level,
        name: name || currentName || getTypeLabel(typeKey),
        isCurrentSelection: true,
      });

      return path;
    };

    return buildPath(selectedType, parentId, currentName);
  }, [selectedType, parentId, institutionTypes, institutions, currentName]);

  if (hierarchyPath.length === 0) {
    return null;
  }

  return (
    <div className={cn("p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200", className)}>
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Building className="h-4 w-4 text-blue-600" />
          İnstitusional İyerarxiya
        </h4>
        <p className="text-xs text-gray-600 mt-1">
          Müəssisənin təhsil sistemindəki yeri və səviyyəsi
        </p>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        {hierarchyPath.map((item, index) => (
          <React.Fragment key={`${item.type}-${item.level}-${index}`}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
            )}
            
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-all",
                getLevelColors(item.level, item.isCurrentSelection)
              )}
              title={`Səviyyə ${item.level}: ${getTypeLabel(item.type)}`}
            >
              {getLevelIcon(item.level, item.type)}
              
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">
                  {item.name}
                </span>
                <span className="text-xs opacity-75">
                  Səviyyə {item.level}
                </span>
              </div>
              
              {item.isCurrentSelection && (
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" 
                       title="Hazırda seçilən növ" />
                </div>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
      
      {/* Level indicator */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Təhsil Səviyyələri:</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-600 rounded-sm"></div>
              <span>Nazirlik</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
              <span>Regional</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
              <span>Sektor</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
              <span>Məktəb</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact version of hierarchy path for smaller spaces
 */
export const HierarchyPathCompact: React.FC<HierarchyPathProps> = (props) => {
  return (
    <HierarchyPath
      {...props}
      className={cn("p-2 text-xs", props.className)}
    />
  );
};