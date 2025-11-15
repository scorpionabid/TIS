import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Edit, Trash2, Loader2, ExternalLink } from 'lucide-react';
import type { Resource } from '@/types/resources';

interface LinkManagementTableProps {
  links: Resource[];
  isLoading: boolean;
  onResourceAction: (resource: Resource, action: 'edit' | 'delete') => Promise<void> | void;
}

const LinkManagementTable: React.FC<LinkManagementTableProps> = ({
  links,
  isLoading,
  onResourceAction,
}) => {
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await onResourceAction(pendingDelete, 'delete');
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Mövcud Linklər</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cəmi {links.length} link sistemdə qeydiyyatdadır
            </p>
          </div>
        </CardHeader>
        <CardContent className="h-full flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Linklər yüklənir...
            </div>
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Hələlik link əlavə olunmayıb.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2">Başlıq</th>
                    <th className="py-2">Növ</th>
                    <th className="py-2">Paylaşım sahəsi</th>
                    <th className="py-2 text-right">Əməliyyatlar</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((link) => (
                    <tr key={link.id} className="border-b last:border-0">
                      <td className="py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-sm">{link.title}</span>
                          {link.url && (
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary inline-flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Linkə keç
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className="text-xs">
                          {link.link_type || '—'}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <span className="text-xs text-muted-foreground">
                          {link.share_scope || '—'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onResourceAction(link, 'edit')}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setPendingDelete(link)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && !isDeleting && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Linki silmək istəyirsiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? `"${pendingDelete.title}" linki silinəcək. Bu əməliyyat geri qaytarıla bilməz.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Ləğv et</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Silinir...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LinkManagementTable;
