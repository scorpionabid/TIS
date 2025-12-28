import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  School,
  BookOpen,
  Award,
  Calendar,
  FileText,
  CheckSquare,
  TrendingUp,
  Users,
  ChevronRight,
  GraduationCap,
  ClipboardList,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
  badge?: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon: Icon,
  path,
  color,
  badge,
}) => {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary group"
      onClick={() => navigate(path)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-lg ${color} bg-opacity-10 group-hover:bg-opacity-20 transition-all`}>
            <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
          </div>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg mt-4 group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="ghost" className="w-full justify-between group-hover:bg-primary/5">
          Daxil ol
          <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
};

interface TeacherDashboardProps {
  className?: string;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ className }) => {
  const { currentUser } = useAuth();

  const quickActions: QuickActionCardProps[] = [
    {
      title: 'Mənim Siniflərим',
      description: 'Təyin edildiyi sinifləri idarə edin və şagirdləri görün',
      icon: School,
      path: '/school/classes',
      color: 'bg-blue-500',
    },
    {
      title: 'Qiymət Daxil Etmə',
      description: 'Şagirdlərin qiymətlərini daxil edin və yeniləyin',
      icon: TrendingUp,
      path: '/assessments/entry',
      color: 'bg-green-500',
    },
    {
      title: 'Qiymət Dəftəri',
      description: 'Sinif qiymətləndirmələrini görün və idarə edin',
      icon: BookOpen,
      path: '/school/gradebook',
      color: 'bg-purple-500',
    },
    {
      title: 'Mənim Reytinqim',
      description: 'Şəxsi performans göstəricilərini və reytinqi izləyin',
      icon: Award,
      path: '/teacher/rating/profile',
      color: 'bg-yellow-500',
      badge: 'Yeni',
    },
    {
      title: 'Dərs Cədvəlim',
      description: 'Həftəlik dərs cədvəlinizi görün',
      icon: Calendar,
      path: '/teacher/schedule',
      color: 'bg-orange-500',
    },
    {
      title: 'Sorğular',
      description: 'Gözləyən və tamamlanmış sorğularınızı idarə edin',
      icon: ClipboardList,
      path: '/my-surveys/pending',
      color: 'bg-cyan-500',
    },
    {
      title: 'Tapşırıqlar',
      description: 'Təyin edilmiş tapşırıqları görün və tamamlayın',
      icon: CheckSquare,
      path: '/tasks/assigned',
      color: 'bg-pink-500',
    },
    {
      title: 'Resurslarım',
      description: 'Paylaşılan fayllar və məlumat folderlərə giriş',
      icon: FileText,
      path: '/my-resources',
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/10 rounded-full">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-1">
              Xoş gəlmisiniz, {currentUser?.first_name || 'Müəllim'}!
            </h1>
            <p className="text-primary-foreground/90">
              {currentUser?.institution?.name || 'Məktəb'}
            </p>
          </div>
          {currentUser?.email && (
            <div className="text-right hidden sm:block">
              <p className="text-sm text-primary-foreground/80">İstifadəçi adı</p>
              <p className="font-medium">{currentUser.email.split('@')[0]}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Aktiv Siniflər</CardDescription>
            <CardTitle className="text-3xl">-</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Ümumi Şagirdlər</CardDescription>
            <CardTitle className="text-3xl">-</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Gözləyən Tapşırıqlar</CardDescription>
            <CardTitle className="text-3xl">-</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Reytinq Balı</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Award className="h-6 w-6 text-yellow-500" />
              -
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Tez Keçidlər</h2>
            <p className="text-sm text-muted-foreground">
              Ən çox istifadə olunan səhifələrə tez giriş
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <QuickActionCard key={action.path} {...action} />
          ))}
        </div>
      </div>

      {/* Recent Activity Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Son Fəaliyyətlər
          </CardTitle>
          <CardDescription>
            Sistemdəki son işlərinizin qısa xülasəsi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Son fəaliyyətləriniz burada görünəcək</p>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Kömək lazımdır?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            ATİS sistemindən istifadə ilə bağlı suallarınız varsa, texniki dəstək
            komandası ilə əlaqə saxlayın.
          </p>
          <Button variant="outline" size="sm">
            Texniki Dəstək
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherDashboard;
