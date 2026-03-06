import React, { useEffect, useMemo, useState } from 'react';
import { Link, Building2, Users as UsersIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InstitutionTargeting } from "./InstitutionTargeting";
import { UserTargeting } from "./UserTargeting";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Institution } from "@/services/institutions";
import { Resource } from '@/types/resources';

type TargetingMode = 'institutions' | 'users';

interface LinkFormTabProps {
  form: any;
  availableInstitutions: Institution[];
  maybeDefaultInstitutions?: () => void;
  isOpen?: boolean;
  mode?: 'create' | 'edit';
  resource?: Resource | null;
}

const TARGETING_STORAGE_KEY = 'resources.linkForm.lastTargeting';

const detectLinkTypeFromUrl = (url: string): 'external' | 'video' | 'form' | 'document' => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (/(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)/.test(host)) {
      return 'video';
    }
    if (/forms\.gle|docs\.google\.com\/forms|typeform\.com/.test(host)) {
      return 'form';
    }
    if (/docs\.google\.com\/(document|spreadsheets|presentation|drive)|dropbox\.com|onedrive\.live\.com/.test(host) || /\.(pdf|docx?|pptx?|xlsx?)$/.test(path)) {
      return 'document';
    }
    return 'external';
  } catch {
    return 'external';
  }
};

export function LinkFormTab({
  form,
  availableInstitutions,
  maybeDefaultInstitutions,
  isOpen = false,
  mode = 'create',
  resource = null,
}: LinkFormTabProps) {
  const [targetingMode, setTargetingMode] = useState<TargetingMode>('institutions');
  const [linkPreview, setLinkPreview] = useState<{
    hostname: string;
    protocol: string;
    path: string;
  } | null>(null);
  const [urlStatus, setUrlStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [linkTypeLockedByUser, setLinkTypeLockedByUser] = useState(false);
  const urlValue = form.watch('url');
  const currentLinkType = form.watch('link_type');

  // Clear the other targeting option when switching modes
  const handleTargetingModeChange = (mode: TargetingMode) => {
    console.log('[LinkFormTab] targeting mode change', {
      previousMode: targetingMode,
      nextMode: mode,
      timestamp: new Date().toISOString()
    });
    setTargetingMode(mode);
    if (mode === 'institutions') {
      form.setValue('target_users', []);
      console.log('[LinkFormTab] cleared target_users because institutions mode selected');
      form.setValue('share_scope', 'institutional');
      console.log('[LinkFormTab] share_scope set to institutional for institutions mode');
      maybeDefaultInstitutions?.();
    } else {
      form.setValue('target_institutions', []);
      console.log('[LinkFormTab] cleared target_institutions because users mode selected');
      form.setValue('share_scope', 'specific_users');
      console.log('[LinkFormTab] share_scope set to specific_users for users mode');
    }
  };

  // Restore last targeting selection for new resources
  useEffect(() => {
    if (!isOpen || mode === 'edit' || resource) return;
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(TARGETING_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        mode?: TargetingMode;
        share_scope?: string;
        target_institutions?: number[];
        target_users?: number[];
      };
      if (!saved?.mode) return;

      setTargetingMode(saved.mode);
      if (saved.share_scope) {
        form.setValue('share_scope', saved.share_scope);
      }
      if (saved.mode === 'institutions' && saved.target_institutions?.length) {
        form.setValue('target_institutions', saved.target_institutions);
      }
      if (saved.mode === 'users' && saved.target_users?.length) {
        form.setValue('target_users', saved.target_users);
      }
    } catch (error) {
      console.warn('Failed to restore link targeting preferences', error);
    }
  }, [isOpen, mode, resource, form]);

  // Persist targeting selection whenever relevant fields change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const subscription = form.watch((value: any, info: { name?: string }) => {
      if (!info?.name) return;
      if (['target_institutions', 'target_users', 'share_scope'].includes(info.name)) {
        const payload = {
          mode: targetingMode,
          share_scope: value.share_scope,
          target_institutions: value.target_institutions || [],
          target_users: value.target_users || [],
        };
        window.localStorage.setItem(TARGETING_STORAGE_KEY, JSON.stringify(payload));
      }
    });
    return () => subscription.unsubscribe();
  }, [form, targetingMode]);

  // Build URL preview info + auto-detect link type
  useEffect(() => {
    if (!urlValue) {
      setLinkPreview(null);
      setUrlStatus('idle');
      return;
    }

    try {
      const parsed = new URL(urlValue);
      setLinkPreview({
        hostname: parsed.hostname.replace(/^www\./, ''),
        protocol: parsed.protocol.replace(':', ''),
        path: parsed.pathname === '/' ? '' : parsed.pathname,
      });
      setUrlStatus('valid');

      if (!linkTypeLockedByUser) {
        const detectedType = detectLinkTypeFromUrl(urlValue);
        if (detectedType !== currentLinkType) {
          form.setValue('link_type', detectedType, { shouldDirty: true });
        }
      }
    } catch {
      setLinkPreview(null);
      setUrlStatus('invalid');
    }
  }, [urlValue, currentLinkType, linkTypeLockedByUser, form]);

  const previewLabel = useMemo(() => {
    if (!linkPreview) return '';
    return `${linkPreview.hostname}${linkPreview.path}`;
  }, [linkPreview]);

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {/* Basic Link Information */}
        <div className="space-y-3">

          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label htmlFor="title">Link Başlığı *</Label>
              <Input
                {...form.register('title')}
                placeholder="Link başlığını daxil edin"
                className="mt-1"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="url">Link URL *</Label>
              <Input
                {...form.register('url')}
                type="url"
                placeholder="https://example.com"
                className="mt-1"
              />
              {form.formState.errors.url && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.url.message}</p>
              )}
              {urlStatus === 'invalid' && urlValue && (
                <p className="text-sm text-red-600 mt-1">URL düzgün formatda deyil.</p>
              )}
              {linkPreview && (
                <Card className="mt-3 border-blue-100 bg-blue-50/60">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-blue-900">{previewLabel}</p>
                        <p className="text-xs text-blue-700/80">{linkPreview.protocol.toUpperCase()} • avtomatik ön baxış</p>
                      </div>
                      <Badge variant="outline" className="text-xs border-blue-200 text-blue-800">
                        {currentLinkType === 'video' && 'Video'}
                        {currentLinkType === 'form' && 'Form'}
                        {currentLinkType === 'document' && 'Sənəd'}
                        {currentLinkType === 'external' && 'Xarici link'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <Label>Link Növü *</Label>
              <Select
                value={currentLinkType}
                onValueChange={(value) => {
                  console.log('🔗 Link type changed:', value);
                  setLinkTypeLockedByUser(true);
                  form.setValue('link_type', value);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Link növünü seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">Xarici Link</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="form">Form</SelectItem>
                  <SelectItem value="document">Sənəd</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.link_type && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.link_type.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Təsvir</Label>
              <Textarea
                {...form.register('description')}
                placeholder="Link haqqında qısa məlumat"
                className="mt-1"
                rows={3}
              />
            </div>

          </div>
        </div>

        {/* Targeting Mode Selector - Enhanced */}
        <div className="border-t pt-6 space-y-4">
          <div>
            <Label className="text-base font-semibold">Paylaşma üsulu</Label>
            <p className="text-sm text-gray-500 mt-1">Linki kimə göndərmək istəyirsiniz?</p>
          </div>

          <RadioGroup
            value={targetingMode}
            onValueChange={(value) => handleTargetingModeChange(value as TargetingMode)}
            className="grid grid-cols-2 gap-3"
          >
            <div
              className={`relative flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                targetingMode === 'institutions'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleTargetingModeChange('institutions')}
            >
              <RadioGroupItem value="institutions" id="target-institutions" className="shrink-0" />
              <Label htmlFor="target-institutions" className="cursor-pointer flex items-center gap-3 flex-1">
                <div className={`p-2 rounded-lg ${
                  targetingMode === 'institutions' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Building2 className={`h-5 w-5 ${
                    targetingMode === 'institutions' ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">Müəssisələr</div>
                  <div className="text-xs text-gray-500 mt-0.5">Regional, Sektor, Məktəb</div>
                </div>
              </Label>
            </div>

            <div
              className={`relative flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                targetingMode === 'users'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleTargetingModeChange('users')}
            >
              <RadioGroupItem value="users" id="target-users" className="shrink-0" />
              <Label htmlFor="target-users" className="cursor-pointer flex items-center gap-3 flex-1">
                <div className={`p-2 rounded-lg ${
                  targetingMode === 'users' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <UsersIcon className={`h-5 w-5 ${
                    targetingMode === 'users' ? 'text-green-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">Xüsusi istifadəçilər</div>
                  <div className="text-xs text-gray-500 mt-0.5">Seçilmiş şəxslər</div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Conditional Targeting Component */}
        {targetingMode === 'institutions' ? (
          <InstitutionTargeting
            form={form}
            availableInstitutions={availableInstitutions}
          />
        ) : (
          <UserTargeting form={form} />
        )}
      </div>
    </div>
  );
}
