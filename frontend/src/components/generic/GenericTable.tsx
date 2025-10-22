import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { ColumnConfig, ActionConfig, BaseEntity } from './types';

interface GenericTableProps<T extends BaseEntity> {
  columns: ColumnConfig<T>[];
  data: T[];
  actions: ActionConfig<T>[];
  isLoading?: boolean;
  onRowSelect?: (item: T) => void;
  selectedItems?: T[];
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  customRowRender?: (item: T, defaultRender: React.ReactNode) => React.ReactNode;
}

export function GenericTable<T extends BaseEntity>({
  columns,
  data,
  actions,
  isLoading = false,
  onRowSelect,
  selectedItems = [],
  onSelectAll,
  isAllSelected,
  isIndeterminate,
  customRowRender,
}: GenericTableProps<T>) {

  const isItemSelected = (item: T) => {
    return selectedItems.some(selected => selected.id === item.id);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {onRowSelect && (
                <TableHead className="w-12">
                  <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                </TableHead>
              )}
              {columns.map((column, index) => (
                <TableHead key={index} className={column.width} style={{ textAlign: column.align || 'left' }}>
                  {column.label}
                </TableHead>
              ))}
              {actions.length > 0 && (
                <TableHead className="text-right">Əməliyyatlar</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {onRowSelect && (
                  <TableCell>
                    <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                  </TableCell>
                )}
                {columns.map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <div className="w-32 h-4 bg-muted rounded animate-pulse" />
                  </TableCell>
                ))}
                {actions.length > 0 && (
                  <TableCell>
                    <div className="w-20 h-4 bg-muted rounded animate-pulse" />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {/* Bulk selection checkbox */}
            {onRowSelect && (
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  {...(isIndeterminate ? { indeterminate: true } : {})}
                  onCheckedChange={onSelectAll}
                  aria-label="Hamısını seç"
                />
              </TableHead>
            )}
            
            {/* Column headers */}
            {columns.map((column, index) => (
              <TableHead 
                key={index} 
                className={column.width} 
                style={{ textAlign: column.align || 'left' }}
              >
                {column.label}
              </TableHead>
            ))}
            
            {/* Actions header */}
            {actions.length > 0 && (
              <TableHead className="text-right">Əməliyyatlar</TableHead>
            )}
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {(() => {
            console.log('🔍 GenericTable: Rendering data:', data?.length || 0, 'items');
            if (data?.length) {
              console.log('📊 GenericTable: First item:', data[0]);
            }
            return (data || []);
          })().map((item) => {
            const defaultRow = (
              <TableRow key={item.id}>
                {/* Selection checkbox */}
                {onRowSelect && (
                  <TableCell>
                    <Checkbox
                      checked={isItemSelected(item)}
                      onCheckedChange={() => onRowSelect(item)}
                      aria-label={`Seç ${item.id}`}
                    />
                  </TableCell>
                )}
                
                {/* Data columns */}
                {columns.map((column, colIndex) => {
                  const value = item[column.key as keyof T];
                  
                  return (
                    <TableCell 
                      key={colIndex} 
                      style={{ textAlign: column.align || 'left' }}
                    >
                      {column.render ? 
                        column.render(item, value) : 
                        value !== null && value !== undefined ? String(value) : '-'
                      }
                    </TableCell>
                  );
                })}
                
                {/* Action buttons */}
                {actions.length > 0 && (
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {/* Primary actions - always visible as buttons */}
                      {actions
                        .filter(action => (action as any).isPrimary)
                        .map((action) => {
                          const isVisible = action.isVisible ? action.isVisible(item) : true;
                          const isDisabled = action.isDisabled ? action.isDisabled(item) : false;

                          if (!isVisible) return null;

                          return (
                            <Button
                              key={action.key}
                              variant={action.variant || 'ghost'}
                              size={action.size || 'sm'}
                              onClick={() => action.onClick(item)}
                              disabled={isDisabled}
                              title={action.label}
                              className="gap-1.5"
                            >
                              <action.icon className="h-3.5 w-3.5" />
                              <span className="text-xs">{action.label}</span>
                            </Button>
                          );
                        })}

                      {/* Secondary actions - dropdown menu */}
                      {actions.filter(action => !(action as any).isPrimary).length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Əməliyyatlar menyusu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {actions
                              .filter(action => !(action as any).isPrimary)
                              .map((action, index, arr) => {
                                const isVisible = action.isVisible ? action.isVisible(item) : true;
                                const isDisabled = action.isDisabled ? action.isDisabled(item) : false;

                                if (!isVisible) return null;

                                // Add separator before destructive actions
                                const isDestructive = action.variant === 'destructive';
                                const prevAction = index > 0 ? arr[index - 1] : null;
                                const prevIsDestructive = prevAction ? prevAction.variant === 'destructive' : false;
                                const showSeparator = isDestructive && !prevIsDestructive && index > 0;

                                return (
                                  <React.Fragment key={action.key}>
                                    {showSeparator && <DropdownMenuSeparator />}
                                    <DropdownMenuItem
                                      onClick={() => action.onClick(item)}
                                      disabled={isDisabled}
                                      className={isDestructive ? 'text-red-600 focus:text-red-600' : ''}
                                    >
                                      <action.icon className="mr-2 h-4 w-4" />
                                      <span>{action.label}</span>
                                    </DropdownMenuItem>
                                  </React.Fragment>
                                );
                              })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );

            // Use custom row render if provided
            return customRowRender ? 
              customRowRender(item, defaultRow) : 
              defaultRow;
          })}
        </TableBody>
      </Table>
    </div>
  );
}