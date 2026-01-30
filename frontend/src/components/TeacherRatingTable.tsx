/**
 * TeacherRatingTable Component
 *
 * Displays teacher rating data in a sortable, paginated table
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Eye, Calculator, TrendingUp, Award } from 'lucide-react';
import type { RatingResult, TeacherRatingProfile } from '../../types/teacherRating';

interface TeacherRatingTableProps {
  data: Array<RatingResult & { teacher: TeacherRatingProfile }>;
  onCalculate?: (teacherId: number) => void;
  onViewProfile?: (teacherId: number) => void;
  showActions?: boolean;
  canCalculate?: boolean;
}

export function TeacherRatingTable({
  data,
  onCalculate,
  onViewProfile,
  showActions = true,
  canCalculate = false,
}: TeacherRatingTableProps) {
  const navigate = useNavigate();

  const handleViewProfile = (teacherId: number) => {
    if (onViewProfile) {
      onViewProfile(teacherId);
    } else {
      navigate(`/regionadmin/teacher-rating/profile/${teacherId}`);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 font-bold';
    if (score >= 80) return 'text-blue-600 font-semibold';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRankBadge = (rank: number | null): React.ReactNode => {
    if (!rank) return <span className="text-gray-400">-</span>;

    if (rank === 1) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
          🥇 {rank}
        </Badge>
      );
    }
    if (rank === 2) {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-300">
          🥈 {rank}
        </Badge>
      );
    }
    if (rank === 3) {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-300">
          🥉 {rank}
        </Badge>
      );
    }

    return <Badge variant="outline">{rank}</Badge>;
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-gray-50">
        <p className="text-gray-500">Məlumat tapılmadı</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>UTIS Kod</TableHead>
            <TableHead>Ad Soyad</TableHead>
            <TableHead>Məktəb</TableHead>
            <TableHead>Fənn</TableHead>
            <TableHead className="text-center">Ümumi Bal</TableHead>
            <TableHead className="text-center">Məktəb Sırası</TableHead>
            <TableHead className="text-center">Rayon Sırası</TableHead>
            <TableHead className="text-center">Region Sırası</TableHead>
            {showActions && <TableHead className="text-right">Əməliyyatlar</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={item.id} className="hover:bg-gray-50">
              <TableCell className="font-medium text-gray-500">
                {index + 1}
              </TableCell>
              <TableCell>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {item.teacher.utis_code}
                </code>
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {item.teacher.photo_path && (
                    <img
                      src={item.teacher.photo_path}
                      alt={item.teacher.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <span>{item.teacher.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {item.teacher.school.name}
              </TableCell>
              <TableCell className="text-sm">
                {item.teacher.primary_subject?.name || '-'}
              </TableCell>
              <TableCell className="text-center">
                <span className={`text-lg ${getScoreColor(item.total_score)}`}>
                  {item.total_score.toFixed(2)}
                </span>
              </TableCell>
              <TableCell className="text-center">
                {getRankBadge(item.rank_school)}
              </TableCell>
              <TableCell className="text-center">
                {getRankBadge(item.rank_district)}
              </TableCell>
              <TableCell className="text-center">
                {getRankBadge(item.rank_region)}
              </TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewProfile(item.teacher_id)}
                      title="Profili Göstər"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canCalculate && onCalculate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCalculate(item.teacher_id)}
                        title="Reytinqi Yenilə"
                      >
                        <Calculator className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
