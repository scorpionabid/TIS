import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { BarChart3, PieChart, Table as TableIcon, Info, HelpCircle } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { Badge } from '../../ui/badge';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';

interface QuestionStat {
  question_index: number;
  question_text: string;
  question_type: string;
  response_count: number;
  skip_rate: number;
  answer_distribution: any;
  average_rating: number | null;
}

interface SurveyQuestionResultsProps {
  stats: QuestionStat[] | undefined;
  isLoading: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const SurveyQuestionResults: React.FC<SurveyQuestionResultsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-5 bg-muted rounded w-1/2 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-40 bg-muted rounded w-full animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
          <HelpCircle className="h-12 w-12 mb-3 opacity-20" />
          <p>Sual analitikası mövcud deyil</p>
        </CardContent>
      </Card>
    );
  }

  const renderDistribution = (stat: QuestionStat) => {
    const { question_type, answer_distribution } = stat;

    // Handle Matrix Question
    if (question_type === 'table_matrix' && answer_distribution) {
      return (
        <div className="space-y-4">
          {Object.entries(answer_distribution).map(([row, dist]: [string, any]) => {
            const data = Object.entries(dist).map(([label, value]) => ({ name: label, value }));
            return (
              <div key={row} className="border rounded-lg p-3 bg-slate-50/50">
                <h5 className="text-xs font-semibold mb-3 text-slate-700 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {row}
                </h5>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 40, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        fontSize={10} 
                        tick={{ fill: '#64748b' }}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: '#f1f5f9' }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                        {data.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Handle Single/Multiple Choice
    if ((question_type === 'single_choice' || question_type === 'multiple_choice') && answer_distribution) {
      const data = Object.entries(answer_distribution).map(([label, value]) => ({ name: label, value }));
      
      if (data.length === 0) return <p className="text-xs text-muted-foreground italic">Cavab yoxdur</p>;

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {data.map((item, idx) => {
              const total = data.reduce((acc, curr) => acc + (curr.value as number), 0);
              const percent = Math.round(((item.value as number) / total) * 100);
              return (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-xs font-medium text-slate-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-900">{item.value}</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">{percent}%</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Handle Rating
    if (question_type === 'rating' && answer_distribution) {
      const data = Object.entries(answer_distribution)
        .map(([label, value]) => ({ name: `${label}⭐`, value }))
        .sort((a, b) => parseInt(a.name) - parseInt(b.name));

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
               <div className="text-[10px] uppercase font-bold text-amber-600 mb-0.5 tracking-wider">Orta Qiymət</div>
               <div className="text-2xl font-black text-amber-700 leading-none">{stat.average_rating || '0.0'}</div>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: '#64748b' }} />
                <YAxis fontSize={11} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    // Handle Table Input
    if (question_type === 'table_input' && answer_distribution) {
      return (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border bg-blue-50/30 border-blue-100">
            <div className="text-[10px] text-blue-600 font-bold uppercase mb-1">Cəmi Sətir</div>
            <div className="text-xl font-bold text-blue-900">{answer_distribution.total_rows}</div>
          </div>
          <div className="p-3 rounded-lg border bg-indigo-50/30 border-indigo-100">
            <div className="text-[10px] text-indigo-600 font-bold uppercase mb-1">Orta Sətir</div>
            <div className="text-xl font-bold text-indigo-900">{answer_distribution.avg_rows}</div>
          </div>
          <div className="p-3 rounded-lg border bg-slate-50/30 border-slate-100">
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Cavab Sayı</div>
            <div className="text-xl font-bold text-slate-900">{answer_distribution.response_count}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
        <TableIcon className="h-4 w-4 text-slate-400" />
        <span className="text-xs text-slate-500 italic">Bu sual tipi üçün vizualizasiya dəstəklənmir. Cavabları cədvəldən görə bilərsiniz.</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          Suallar üzrə Analiz
        </h3>
        <Badge variant="outline" className="text-[10px] font-bold py-1">
          {stats.length} Sual
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                  {idx + 1}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {stat.question_type.replace('_', ' ')}
                </span>
              </div>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 cursor-help">
                      <div className="text-[10px] text-slate-400 font-medium">
                        Buraxılma: <span className={cn(stat.skip_rate > 20 ? "text-rose-500 font-bold" : "text-slate-600")}>{stat.skip_rate}%</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Cavab: <span className="text-slate-600 font-bold">{stat.response_count}</span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-[10px]">Cəmi hədəf kütləsinin cavab vermə statistikası</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            <CardHeader className="py-4 px-6">
              <CardTitle className="text-sm font-bold text-slate-800 leading-snug">
                {stat.question_text}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {renderDistribution(stat)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SurveyQuestionResults;
