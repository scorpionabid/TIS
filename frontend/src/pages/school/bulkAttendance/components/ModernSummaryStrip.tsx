import React from 'react';
import {
  GraduationCap,
  Users,
  BookOpen,
  CheckCircle,
  XCircle,
  Shirt,
  Percent,
  TrendingUp,
} from 'lucide-react';

interface StatItem {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
}

interface ModernSummaryStripProps {
  classCount: number;
  totalStudents: number;
  totalPresent: number;
  totalExcused: number;
  totalUnexcused: number;
  uniformViolationTotal: number;
  uniformComplianceRate: number;
  sessionRate: number;
  overallDailyRate: number;
  classesCompleted: number;
  totalClasses: number;
  sessionLabel: string;
}

const ModernSummaryStrip: React.FC<ModernSummaryStripProps> = ({
  classCount,
  totalStudents,
  totalPresent,
  totalExcused,
  totalUnexcused,
  uniformViolationTotal,
  uniformComplianceRate,
  sessionRate,
  overallDailyRate,
  classesCompleted,
  totalClasses,
  sessionLabel,
}) => {
  const stats: StatItem[] = [
    {
      icon: <GraduationCap className="w-5 h-5" />,
      value: classCount,
      label: 'Sinif sayı',
      iconBg: 'bg-[rgba(21,101,192,0.12)]',
      iconColor: 'text-[#1565c0]',
      valueColor: 'text-[#1565c0]',
    },
    {
      icon: <Users className="w-5 h-5" />,
      value: totalStudents,
      label: 'Ümumi şagird',
      iconBg: 'bg-[rgba(46,125,50,0.12)]',
      iconColor: 'text-[#2e7d32]',
      valueColor: 'text-[#2e7d32]',
    },
    {
      icon: <BookOpen className="w-5 h-5" />,
      value: totalPresent,
      label: 'Dərsdə olan',
      iconBg: 'bg-[rgba(94,53,177,0.12)]',
      iconColor: 'text-[#5e35b1]',
      valueColor: 'text-[#5e35b1]',
    },
    {
      icon: <CheckCircle className="w-5 h-5" />,
      value: totalExcused,
      label: 'Üzürlü',
      iconBg: 'bg-[rgba(85,139,47,0.12)]',
      iconColor: 'text-[#558b2f]',
      valueColor: 'text-[#558b2f]',
    },
    {
      icon: <XCircle className="w-5 h-5" />,
      value: totalUnexcused,
      label: 'Üzürsüz',
      iconBg: 'bg-[rgba(198,40,40,0.12)]',
      iconColor: 'text-[#c62828]',
      valueColor: 'text-[#c62828]',
    },
    {
      icon: <Shirt className="w-5 h-5" />,
      value: `+${uniformViolationTotal}`,
      label: 'Forma pozuntusu',
      iconBg: 'bg-[rgba(230,81,0,0.12)]',
      iconColor: 'text-[#e65100]',
      valueColor: 'text-[#e65100]',
    },
    {
      icon: <Percent className="w-5 h-5" />,
      value: `${uniformComplianceRate}%`,
      label: 'Forma faizi',
      iconBg: 'bg-[rgba(0,105,92,0.12)]',
      iconColor: 'text-[#00695c]',
      valueColor: 'text-[#00695c]',
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      value: `${sessionRate}%`,
      label: 'Davamiyyət faizi',
      iconBg: 'bg-[rgba(40,53,147,0.12)]',
      iconColor: 'text-[#283593]',
      valueColor: 'text-[#283593]',
    },
  ];

  return (
    <div className="flex bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] my-5 overflow-x-auto">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="flex-1 flex flex-col items-center justify-center py-4 px-2 min-w-[80px] relative transition-all duration-300 hover:bg-gradient-to-b hover:from-[rgba(92,107,192,0.04)] hover:to-[rgba(92,107,192,0.01)]"
        >
          {/* Divider */}
          {index < stats.length - 1 && (
            <div className="absolute right-0 top-[18%] h-[64%] w-[1.5px] bg-gradient-to-b from-transparent via-gray-200 to-transparent" />
          )}

          {/* Icon */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${stat.iconBg} ${stat.iconColor}`}
          >
            {stat.icon}
          </div>

          {/* Value */}
          <div className={`text-xl font-extrabold leading-tight whitespace-nowrap ${stat.valueColor}`}>
            {stat.value}
          </div>

          {/* Label */}
          <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider text-center mt-1 leading-tight">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModernSummaryStrip;
