import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, TrendingUp, Award, Users, MapPin, Activity, Calendar, AlertCircle } from 'lucide-react';
import { RatingItem } from '@/types/rating';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';

interface RatingStatsCardsProps {
    data: RatingItem[];
    loading?: boolean;
    variant?: 'school' | 'sector' | 'schooladmin';
}

export const RatingStatsCards: React.FC<RatingStatsCardsProps> = ({ 
    data, 
    loading,
    variant = 'school'
}) => {
    const isSector = variant === 'sector';
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
    const isSchoolAdmin = variant === 'schooladmin';
    const singleRating = isSchoolAdmin ? data[0] : null;

    const statItems = isSchoolAdmin ? [
        {
            title: 'Sektor üzrə yer',
            value: singleRating?.sector_rank ? `${singleRating.sector_rank} / ${singleRating.sector_total || '?'}` : '-',
            description: singleRating?.institution?.sector_name || 'Sektor qrupu',
            icon: MapPin,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            borderColor: 'border-indigo-200'
        },
        {
            title: 'Region üzrə yeri',
            value: singleRating?.region_rank ? `${singleRating.region_rank} / ${singleRating.region_total || '?'}` : '-',
            description: 'Regional idarəetmə',
            icon: Building2,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-200'
        },
        {
            title: 'Gecikmiş davamiyyət',
            value: singleRating?.score_details?.total_late ?? 0,
            description: 'Ümumi gecikmə sayı',
            icon: AlertCircle,
            color: (singleRating?.score_details?.total_late ?? 0) > 0 ? 'text-rose-600' : 'text-slate-400',
            bgColor: (singleRating?.score_details?.total_late ?? 0) > 0 ? 'bg-rose-50' : 'bg-slate-50',
            borderColor: (singleRating?.score_details?.total_late ?? 0) > 0 ? 'border-rose-200' : 'border-slate-200'
        },
        {
            title: 'İllik Dinamika',
            value: singleRating?.overall_score?.toFixed(1) || '0.0',
            description: 'Tədris ili üzrə trend',
            icon: Activity,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-200',
            isChart: true,
            chartData: singleRating?.monthly_trend || []
        }
    ] : [
        {
            title: isSector ? 'Ümumi Sektor Admin' : 'Ümumi Direktor',
            value: stats.total,
            description: isSector ? 'Sektor rəhbəri' : 'Məktəb rəhbəri',
            icon: isSector ? Building2 : Building2,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100'
        },
        {
            title: 'Ortalama Reytinq',
            value: stats.average,
            description: 'Ümumi bal',
            icon: TrendingUp,
            color: 'text-green-600',
            bgColor: 'bg-green-100'
        },
        {
            title: 'Ən Yüksək Bal',
            value: stats.highest,
            description: 'Maksimum nəticə',
            icon: Award,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100'
        },
        {
            title: 'Aktiv Reytinqlər',
            value: stats.active,
            description: 'Dərc edilmiş',
            icon: Users,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statItems.map((item: any, index) => (
                <Card key={index} className={`overflow-hidden border shadow-sm hover:shadow-md transition-all duration-300 ${item.borderColor || 'border-slate-100'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-600">{item.title}</CardTitle>
                        <div className={`p-2 rounded-lg ${item.bgColor} transition-colors`}>
                            <item.icon className={`h-4 w-4 ${item.color}`} />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-2xl font-bold tracking-tight text-slate-900">{loading ? '...' : item.value}</div>
                                <p className="text-xs font-medium text-slate-500 mt-1">{item.description}</p>
                            </div>
                            
                            {item.isChart && item.chartData?.length > 0 && (
                                <div className="h-12 w-24 -mb-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={item.chartData}>
                                            <Line 
                                                type="monotone" 
                                                dataKey="score" 
                                                stroke="#d97706" 
                                                strokeWidth={2} 
                                                dot={false} 
                                                isAnimationActive={true}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </CardContent>
                    {!item.isChart && <div className={`h-1.5 w-full ${item.bgColor.replace('50', '500').replace('100', '500')}`} />}
                    {item.isChart && <div className="h-1.5 w-full bg-amber-500" />}
                </Card>
            ))}
        </div>
    );
};
