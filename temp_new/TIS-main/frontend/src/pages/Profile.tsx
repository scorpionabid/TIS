import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Edit,
  Shield,
  Building2,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { profileService } from '@/services/profile';
import ProfileEditModal from '@/components/profile/ProfileEditModal';

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  login: 'Daxil oldu',
  logout: 'Çıxış etdi',
  create: 'Yaratdı',
  update: 'Yenilədi',
  delete: 'Sildi',
  view: 'Baxdı',
  export: 'İxrac etdi',
  import: 'İdxal etdi',
};

const ROLE_DISPLAY: Record<string, string> = {
  superadmin: 'Super Administrator',
  regionadmin: 'Regional Administrator',
  regionoperator: 'Regional Operator',
  sektoradmin: 'Sektor Administratoru',
  schooladmin: 'Məktəb Administratoru',
  müəllim: 'Müəllim',
};

export default function Profile() {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activityPage, setActivityPage] = useState(1);

  const { data: profileData, isLoading, refetch } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => profileService.getProfile(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['profile-activity', activityPage],
    queryFn: () => profileService.getActivity(activityPage, 10),
    staleTime: 1000 * 60,
  });

  const user = profileData?.user;
  const profile = user?.profile;
  const avatarUrl = profileData?.avatar_url;

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleName = (role: unknown): string => {
    if (typeof role === 'object' && role !== null && 'name' in role) {
      return (role as { name: string }).name;
    }
    return String(role || '');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('az-AZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const roleName = getRoleName(user?.role);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-md">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.name} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {profile?.first_name && profile?.last_name
                    ? `${profile.first_name} ${profile.patronymic ? profile.patronymic + ' ' : ''}${profile.last_name}`
                    : user?.name || 'İstifadəçi'}
                </h1>
                <p className="text-muted-foreground text-sm">@{user?.username}</p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Badge variant="secondary" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {ROLE_DISPLAY[roleName.toLowerCase()] || roleName}
                </Badge>
                {user?.institution && (
                  <Badge variant="outline" className="gap-1">
                    <Building2 className="h-3 w-3" />
                    {user.institution.name}
                  </Badge>
                )}
                {user?.region && (
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {user.region.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Edit Button */}
            <Button
              variant="outline"
              className="flex-shrink-0"
              onClick={() => setIsEditOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Redaktə Et
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info" className="gap-2">
            <User className="h-4 w-4" />
            Şəxsi Məlumatlar
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Clock className="h-4 w-4" />
            Fəaliyyət Tarixçəsi
          </TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="info" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Əlaqə Məlumatları</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="font-medium">{user?.email || '—'}</p>
                  <p className="text-xs text-muted-foreground">E-poçt</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="font-medium">{profile?.contact_phone || '—'}</p>
                  <p className="text-xs text-muted-foreground">Telefon</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="font-medium">
                    {profile?.birth_date ? formatDate(profile.birth_date) : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Doğum tarixi</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="font-medium">
                    {user?.created_at ? formatDate(user.created_at) : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Qeydiyyat tarixi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {profile?.gender && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Əlavə Məlumatlar</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Cins</p>
                  <p className="font-medium">
                    {profile.gender === 'male' ? 'Kişi' : profile.gender === 'female' ? 'Qadın' : 'Digər'}
                  </p>
                </div>
                {profile.national_id && (
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">FİN</p>
                    <p className="font-medium">{profile.national_id}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(profile?.emergency_contact_name || profile?.emergency_contact_phone) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Təcili Əlaqə</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.emergency_contact_name && (
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">Ad</p>
                    <p className="font-medium">{profile.emergency_contact_name}</p>
                  </div>
                )}
                {profile.emergency_contact_phone && (
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">Telefon</p>
                    <p className="font-medium">{profile.emergency_contact_phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activity History Tab */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Son Fəaliyyətlər</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !activityData?.data?.length ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Hələ heç bir fəaliyyət qeydə alınmayıb
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    {activityData.data.map(record => (
                      <div
                        key={record.id}
                        className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/40 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{record.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ACTIVITY_TYPE_LABELS[record.activity_type] || record.activity_type}
                            {record.entity_type && ` · ${record.entity_type}`}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                          {formatDateTime(record.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {activityData.last_page > 1 && (
                    <div className="flex items-center justify-between mt-4 text-sm">
                      <p className="text-muted-foreground">
                        {activityData.total} fəaliyyətdən {activityPage === 1 ? 1 : (activityPage - 1) * 10 + 1}–
                        {Math.min(activityPage * 10, activityData.total)}-i
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={activityPage === 1}
                          onClick={() => setActivityPage(p => p - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={activityPage === activityData.last_page}
                          onClick={() => setActivityPage(p => p + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        profileData={profileData}
        onProfileUpdate={() => {
          refetch();
          setIsEditOpen(false);
        }}
      />
    </div>
  );
}
