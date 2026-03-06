/**
 * Step1BasicInfo Component
 * Basic information form for the table
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Eye } from 'lucide-react';
import type { StepProps } from '../types';
import { MAX_ROWS_OPTIONS } from '../constants';

export function Step1BasicInfo({
  formData,
  onChange,
  validation,
  isEditing,
}: StepProps) {
  const { valid, fields } = validation.step1;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">
          Başlıq <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="Məs: Məktəbin texniki avadanlıq siyahısı"
          maxLength={300}
          autoFocus
          className={fields.title === false ? 'border-red-500 focus-visible:ring-red-500' : ''}
        />
        {fields.title === false && (
          <p className="text-xs text-red-500">Başlıq tələb olunur (min. 3 simvol)</p>
        )}
        <p className="text-xs text-gray-400 text-right">
          {formData.title.length}/300
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Açıqlama</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Cədvəlin məqsədi və istifadəsi haqqında qısa məlumat..."
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">
          İzahat / Təlimat
          <span className="ml-1 text-xs text-gray-400">(məktəbə göstəriləcək)</span>
        </Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Cədvəli necə doldurmaq lazımdır, hansı qaydalar var..."
          rows={3}
        />
      </div>

      {/* Instruction Preview - matches SchoolAdmin view */}
      {formData.notes && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Eye className="h-3.5 w-3.5" />
            <span>Məktəb admininin görəcəyi formada preview:</span>
          </div>
          <div className="relative overflow-hidden rounded-xl border-l-4 border-amber-500 bg-white shadow-md">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500" />
            <div className="flex gap-4 p-4">
              <div className="flex-shrink-0">
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-2.5 shadow-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-bold border border-amber-300">
                    📋 TƏLİMAT
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-amber-200 to-transparent" />
                </div>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">
                  {formData.notes}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="max_rows">Maksimum sətir sayı</Label>
          <Select
            value={String(formData.max_rows)}
            onValueChange={(v) => onChange('max_rows', Number(v))}
          >
            <SelectTrigger id="max_rows">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MAX_ROWS_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt} sətir
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deadline">Son tarix</Label>
          <Input
            id="deadline"
            type="date"
            value={formData.deadline}
            onChange={(e) => onChange('deadline', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm border">
        <p className="font-medium text-gray-700 mb-2">Cədvəl icmalı:</p>
        <ul className="text-gray-600 space-y-1">
          <li>
            • {formData.columns.length || 0} sütun
            {validation.step2.valid && formData.columns.length > 0 && (
              <span className="text-emerald-600 ml-1">✓</span>
            )}
          </li>
          <li>• Max {formData.max_rows} sətir</li>
          <li>
            • {formData.target_institutions.length} müəssisə seçilib
          </li>
          {formData.deadline && (
            <li>• Son tarix: {new Date(formData.deadline).toLocaleDateString('az-AZ')}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
