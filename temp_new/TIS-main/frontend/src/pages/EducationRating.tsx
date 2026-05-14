import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, GraduationCap, Users, ArrowRight, Star } from 'lucide-react';

export const EducationRating: React.FC = () => {
  const navigate = useNavigate();

  const ratingCategories = [
    {
      id: 'sectors',
      title: 'Sektor Reytingləri',
      description: 'Sektor administratorlarının performans qiymətləndirməsi və reytinq analizi',
      icon: Building2,
      path: '/sector-rating',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'school-admins',
      title: 'Direktor Reytingləri',
      description: 'Məktəb rəhbərlərinin performans qiymətləndirməsi və reytinq analizi',
      icon: GraduationCap,
      path: '/school-admin-rating',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      id: 'teachers',
      title: 'Müəllim Reytingləri',
      description: 'Müəllimlərin performans qiymətləndirməsi və reytinq analizi',
      icon: Users,
      path: '/teacher-rating',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Star className="w-8 h-8 text-yellow-500" />
          Təhsil Reytinqi Paneli
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Təhsil sistemindəki müxtəlif səviyyəli işçilərin fəaliyyətinin monitorinqi və qiymətləndirilməsi mərkəzi
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ratingCategories.map((category) => (
          <Card key={category.id} className="group hover:shadow-lg transition-all duration-300 border-gray-100 flex flex-col">
            <CardHeader>
              <div className={`w-12 h-12 rounded-xl ${category.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <category.icon className={`w-6 h-6 ${category.color}`} />
              </div>
              <CardTitle className="text-xl">{category.title}</CardTitle>
              <CardDescription className="text-sm min-h-[40px]">
                {category.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-0">
              <Button
                onClick={() => navigate(category.path)}
                className="w-full justify-between items-center group-hover:bg-primary transition-colors"
                variant="outline"
              >
                İndi Bax
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Summary Section */}
      <div className="bg-gray-50/50 rounded-2xl p-8 border border-gray-100 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Sistem Haqqında</h3>
            <p className="text-muted-foreground">
              Reytinq sistemi dörd əsas faktor üzərində qurulub: tapşırıqların icrası, sorğu nəticələri,
              avtomatik qeydlər və manual qiymətləndirmə. Hər bir kateqoriya üzrə məlumatlar real vaxt
              rejimində yenilənir və analitik hesabatlar təqdim olunur.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center flex-shrink-0">
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
            <div>
              <div className="text-3xl font-bold">100%</div>
              <p className="text-sm text-muted-foreground">Bütün məlumatlar mərkəzləşdirilib</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducationRating;
