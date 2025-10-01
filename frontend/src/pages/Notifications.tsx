import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Bell, Settings, Eye, Trash2, Check, AlertCircle, Info, CheckCircle, Loader2, Filter, Mail, Archive, Clock, User, FileText, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService, NotificationFilters, Notification } from "@/services/notification";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";

export default function Notifications() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Build filters
  const filters: NotificationFilters = useMemo(() => {
    const f: NotificationFilters = {};
    if (selectedStatus !== 'all') f.status = selectedStatus;
    if (selectedType !== 'all') f.type = selectedType;
    if (selectedPriority !== 'all') f.priority = selectedPriority;
    if (searchQuery.trim()) f.search = searchQuery.trim();
    return f;
  }, [selectedStatus, selectedType, selectedPriority, searchQuery]);

  // Load notifications
  const { data: notificationsResponse, isLoading: notificationsLoading, error } = useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => notificationService.getNotifications(filters),
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });

  // Load notification statistics
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['notification-statistics'],
    queryFn: () => notificationService.getNotificationStatistics(),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Use real data or fallback to mock data
  const notifications = notificationsResponse?.data || notificationService.getMockNotifications();
  const stats = statsResponse?.data || notificationService.getMockStatistics();

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-statistics'] });
      toast({
        title: "Uğurlu",
        description: "Bildiriş oxunmuş kimi qeyd edildi.",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Bildiriş yenilənərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => notificationService.archiveNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-statistics'] });
      toast({
        title: "Uğurlu",
        description: "Bildiriş arxivləşdirildi.",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Bildiriş arxivləşdirilərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-statistics'] });
      toast({
        title: "Uğurlu",
        description: "Bildiriş silindi.",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Bildiriş silinərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-statistics'] });
      toast({
        title: "Uğurlu",
        description: "Bütün bildirişlər oxunmuş kimi qeyd edildi.",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Bildirişlər yenilənərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  // Get notification type icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task': return <Calendar className="h-4 w-4" />;
      case 'survey': return <FileText className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'success': return <CheckCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  // Get notification type color
  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'task': return 'text-blue-500';
      case 'survey': return 'text-purple-500';
      case 'document': return 'text-green-500';
      case 'system': return 'text-gray-500';
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'success': return 'text-green-500';
      default: return 'text-blue-500';
    }
  };

  // Get priority badge variant
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  // Get priority label
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Təcili';
      case 'high': return 'Yüksək';
      case 'medium': return 'Orta';
      case 'low': return 'Aşağı';
      default: return priority;
    }
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'task': return 'Tapşırıq';
      case 'survey': return 'Sorğu';
      case 'document': return 'Sənəd';
      case 'system': return 'Sistem';
      case 'error': return 'Xəta';
      case 'warning': return 'Xəbərdarlıq';
      case 'success': return 'Uğur';
      case 'info': return 'Məlumat';
      default: return type;
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Bildirişlər yüklənərkən problem yarandı.</p>
        <p className="text-sm text-muted-foreground mt-2">Mock məlumatlarla davam edilir</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bildirişlər</h1>
          <p className="text-muted-foreground">Sistem bildirişlərinin idarə edilməsi</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="flex items-center gap-2"
          >
            {markAllAsReadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Hamısını oxunmuş qeyd et
          </Button>
          <Button className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Bildiriş Parametrləri
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Oxunmamış</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.unread_notifications
                  )}
                </p>
              </div>
              <Bell className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bu gün</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.new_today
                  )}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bu həftə</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.this_week
                  )}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.total_notifications
                  )}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filterlər
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün statuslar</SelectItem>
                <SelectItem value="unread">Oxunmamış</SelectItem>
                <SelectItem value="read">Oxunmuş</SelectItem>
                <SelectItem value="archived">Arxivləşmiş</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Növ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün növlər</SelectItem>
                <SelectItem value="task">Tapşırıq</SelectItem>
                <SelectItem value="survey">Sorğu</SelectItem>
                <SelectItem value="document">Sənəd</SelectItem>
                <SelectItem value="system">Sistem</SelectItem>
                <SelectItem value="info">Məlumat</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Prioritet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün prioritetlər</SelectItem>
                <SelectItem value="urgent">Təcili</SelectItem>
                <SelectItem value="high">Yüksək</SelectItem>
                <SelectItem value="medium">Orta</SelectItem>
                <SelectItem value="low">Aşağı</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Bildiriş axtar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Bildirişlər</CardTitle>
          <CardDescription>
            {notifications.length} bildiriş tapıldı
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notificationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Bildirişlər yüklənir...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Seçilmiş kriteriiyalara uyğun bildiriş tapılmadı</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer ${
                    notification.status === 'unread' ? 'border-primary/50 bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => {
                    // Mark as read when clicked
                    if (notification.status === 'unread') {
                      markAsReadMutation.mutate(notification.id);
                    }
                    // Navigate to action URL if available
                    if (notification.data?.action_url) {
                      window.location.href = notification.data.action_url;
                    } else if (notification.action_url) {
                      window.location.href = notification.action_url;
                    }
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`flex items-center gap-2 ${getNotificationTypeColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                        <h3 className="font-medium text-foreground">{notification.title}</h3>
                      </div>
                      <Badge variant={getPriorityVariant(notification.priority)}>
                        {getPriorityLabel(notification.priority)}
                      </Badge>
                      <Badge variant="outline">
                        {getTypeLabel(notification.type)}
                      </Badge>
                      {notification.status === 'unread' && (
                        <Badge variant="default" className="text-xs">
                          Yeni
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(notification.created_at), { 
                            addSuffix: true, 
                            locale: az 
                          })}
                        </span>
                      </div>
                      {notification.sender && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>
                            {notification.sender.first_name} {notification.sender.last_name}
                          </span>
                        </div>
                      )}
                      {notification.read_at && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>
                            Oxundu: {format(new Date(notification.read_at), 'dd.MM.yyyy HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Ətraflı bax"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent parent onClick
                        // Navigate to action URL
                        const actionUrl = notification.data?.action_url || notification.action_url;
                        if (actionUrl) {
                          window.location.href = actionUrl;
                        }
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {notification.status === 'unread' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Oxunmuş qeyd et"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent parent onClick
                          markAsReadMutation.mutate(notification.id);
                        }}
                        disabled={markAsReadMutation.isPending}
                      >
                        {markAsReadMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Oxunmamış qeyd et"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Arxivləşdir"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent parent onClick
                        archiveMutation.mutate(notification.id);
                      }}
                      disabled={archiveMutation.isPending}
                    >
                      {archiveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Sil"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent parent onClick
                        deleteMutation.mutate(notification.id);
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}