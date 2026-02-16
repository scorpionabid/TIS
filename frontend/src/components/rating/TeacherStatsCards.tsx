import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, TrendingUp, Award, Users } from 'lucide-react';
import { RatingItem } from '@/types/rating';

interface TeacherStatsCardsProps {
    data: RatingItem[];
    loading?: boolean;
}

export const TeacherStatsCards: React.FC<TeacherStatsCardsProps> = ({ data, loading }) => {
    const calculateStats = () => {
        if (data.length === 0) {
            return {
                total: 0,
                average: '0',
                highest: '0',
                active: 0
            };
        }

        const scores = data.map(item => Number(item.overall_score) || 0);
        const average = (scores.reduce((sum, score) => sum + score, 0) / data.length).toFixed(1);
        const highest = Math.max(...scores).toFixed(1);
        const active = data.filter(item => item.status === 'published').length;

        return {
            total: data.length,
            average,
            highest,
            active
        };
    };

    const stats = calculateStats();

    const statItems = [
        {
            title: 'Ümumi Müəllim',
            value: stats.total,
            description: 'Sistemdə olan müəllim',
            icon: GraduationCap,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-100'
        },
        {
            title: 'Ortalama Reytinq',
            value: stats.average,
            description: 'Ümumi orta bal',
            icon: TrendingUp,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-100'
        },
        {
            title: 'Ən Yüksək Bal',
            value: stats.highest,
            description: 'Maksimum nəticə',
            icon: Award,
            color: 'text-amber-600',
            bgColor: 'bg-amber-100'
        },
        {
            title: 'Hesablanmış',
            value: stats.active,
            description: 'Dərc edilmiş reytinq',
            icon: Users,
            color: 'text-rose-600',
            bgColor: 'bg-rose-100'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statItems.map((item, index) => (
                <Card key={index} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
                        <div className={`p-2 rounded-lg ${item.bgColor}`}>
                            <item.icon className={`h-4 w-4 ${item.color}`} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? '...' : item.value}</div>
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    </CardContent>
                    <div className={`h-1.5 w-full ${item.bgColor.replace('100', '500')}`} />
                </Card>
            ))}
        </div>
    );
};
