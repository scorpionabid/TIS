import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Link as LinkIcon, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { linkService } from '@/services/links';

interface UserLinkAssignmentPanelProps {
  selectedUserId: number | null;
  onUserSelect: (userId: number) => void;
  onTitleSelect: (title: string) => void;
}

export function UserLinkAssignmentPanel({
  selectedUserId,
  onUserSelect,
  onTitleSelect,
}: UserLinkAssignmentPanelProps) {
  // Fetch user link assignments
  const { data, isLoading } = useQuery({
    queryKey: ['user-link-assignments'],
    queryFn: () => linkService.getUserLinkAssignments({
      role_names: ['regionoperator', 'sektoradmin'],
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const selectedUserData = useMemo(() => {
    if (!selectedUserId || !data?.users) return null;
    return data.users.find(u => u.user_id === selectedUserId);
  }, [selectedUserId, data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Xüsusi İstifadəçilər
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left Panel: User List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            İstifadəçilər
            <Badge variant="secondary" className="ml-auto">
              {data?.total_users || 0} nəfər
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {data?.users.map((user) => (
                <Button
                  key={user.user_id}
                  variant={selectedUserId === user.user_id ? 'default' : 'outline'}
                  className="w-full justify-between h-auto py-3 px-4"
                  onClick={() => onUserSelect(user.user_id)}
                >
                  <div className="flex items-start gap-3 text-left">
                    {/* Role Icon */}
                    <div className="mt-1">
                      {user.role_name === 'regionoperator' && (
                        <div className="h-6 w-6 rounded-full bg-cyan-100 flex items-center justify-center">
                          🔷
                        </div>
                      )}
                      {user.role_name === 'sektoradmin' && (
                        <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                          🟢
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.user_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user.user_email}
                      </div>
                      {user.institution && (
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {user.institution.name}
                        </div>
                      )}
                    </div>

                    {/* Link Count Badge */}
                    <Badge
                      variant={user.total_links_assigned > 0 ? 'default' : 'secondary'}
                      className="ml-2 shrink-0"
                    >
                      {user.total_links_assigned} link
                    </Badge>
                  </div>
                </Button>
              ))}

              {(!data?.users || data.users.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="h-12 w-12 mx-auto opacity-30 mb-2" />
                  <p>RegionOperator və SektorAdmin istifadəçi tapılmadı</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Panel: User's Assigned Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Təyin Olunmuş Linklər
            {selectedUserData && (
              <Badge variant="secondary" className="ml-auto">
                {selectedUserData.total_links_assigned} link
              </Badge>
            )}
          </CardTitle>
          {selectedUserData && (
            <p className="text-sm text-muted-foreground mt-1">
              {selectedUserData.user_name} üçün
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!selectedUserId ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-16 w-16 opacity-20 mb-4" />
              <p className="text-center">
                Sol paneldən istifadəçi seçin
              </p>
            </div>
          ) : selectedUserData ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {selectedUserData.link_groups.map((group, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-between h-auto py-3 px-4 hover:bg-accent"
                    onClick={() => onTitleSelect(group.title)}
                  >
                    <div className="flex items-start gap-3 text-left flex-1 min-w-0">
                      <LinkIcon className="h-4 w-4 mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{group.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {group.count} link · {group.link_type}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-2 shrink-0" />
                  </Button>
                ))}

                {selectedUserData.link_groups.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <LinkIcon className="h-12 w-12 mx-auto opacity-30 mb-2" />
                    <p>Bu istifadəçiyə heç bir link təyin edilməyib</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              İstifadəçi məlumatları yüklənir...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
