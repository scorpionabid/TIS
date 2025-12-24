import { describe, expect, it, beforeEach, vi } from 'vitest';

import { resourceService } from '@/services/resources';
import { linkService } from '@/services/links';
import { documentService } from '@/services/documents';
import { apiClient } from '@/services/api';

vi.mock('@/services/links', () => ({
  linkService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    accessLink: vi.fn(),
    clearServiceCache: vi.fn(),
    getLinkStats: vi.fn(),
    getSharingOverview: vi.fn(),
  },
}));

vi.mock('@/services/documents', () => ({
  documentService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    uploadDocument: vi.fn(),
    updateDocument: vi.fn(),
    delete: vi.fn(),
    downloadDocument: vi.fn(),
    clearServiceCache: vi.fn(),
    getStats: vi.fn(),
  },
}));

vi.mock('@/services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedLinkService = linkService as unknown as {
  getAll: ReturnType<typeof vi.fn>;
  getLinkStats: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  clearServiceCache: ReturnType<typeof vi.fn>;
  getById: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  accessLink: ReturnType<typeof vi.fn>;
  getSharingOverview: ReturnType<typeof vi.fn>;
};

const mockedDocumentService = documentService as unknown as {
  getAll: ReturnType<typeof vi.fn>;
  getStats: ReturnType<typeof vi.fn>;
  uploadDocument: ReturnType<typeof vi.fn>;
  updateDocument: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  downloadDocument: ReturnType<typeof vi.fn>;
  clearServiceCache: ReturnType<typeof vi.fn>;
};

const mockedApiClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('ResourceService.getAll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges link and document payloads and sorts by created_at', async () => {
    mockedLinkService.getAll.mockResolvedValue({
      data: {
        data: [
          { id: 1, title: 'Link B', created_at: '2025-01-10T08:00:00Z', shared_by: 22, share_scope: 'regional' },
          { id: 2, title: 'Link A', created_at: '2025-01-12T08:00:00Z', shared_by: 22, share_scope: 'regional' },
        ],
      },
    });

    mockedDocumentService.getAll.mockResolvedValue({
      data: {
        data: [
          { id: 3, title: 'Document X', created_at: '2025-01-11T08:00:00Z', uploaded_by: 7 },
        ],
      },
    });

    const response = await resourceService.getAll();

    expect(response.meta.total).toBe(3);
    expect(response.data.map((item) => item.id)).toEqual([2, 3, 1]);
    expect(response.data.filter((item) => item.type === 'link')).toHaveLength(2);
    expect(response.data.filter((item) => item.type === 'document')).toHaveLength(1);
  });

  it('maps filters to link and document service requests', async () => {
    mockedLinkService.getAll.mockResolvedValue({ data: { data: [] } });
    mockedDocumentService.getAll.mockResolvedValue({ data: { data: [] } });

    const filters = {
      search: 'STEM',
      link_type: 'video' as const,
      share_scope: 'regional' as const,
      status: 'active',
      creator_id: 12,
      institution_id: 5,
      institution_ids: [5, 6],
      created_after: '2025-01-01',
      created_before: '2025-01-31',
      my_links: true,
      sort_by: 'title',
      sort_direction: 'asc' as const,
      per_page: 10,
      category: 'report',
      access_level: 'institutional' as const,
    };

    await resourceService.getAll(filters);

    expect(mockedLinkService.getAll).toHaveBeenCalledWith({
      search: 'STEM',
      link_type: 'video',
      share_scope: 'regional',
      is_featured: undefined,
      status: 'active',
      creator_id: 12,
      institution_id: 5,
      institution_ids: [5, 6],
      date_from: '2025-01-01',
      date_to: '2025-01-31',
      my_links: true,
      sort_by: 'title',
      sort_direction: 'asc',
      per_page: 10,
    });

    expect(mockedDocumentService.getAll).toHaveBeenCalledWith({
      search: 'STEM',
      category: 'report',
      access_level: 'institutional',
      mime_type: undefined,
      status: 'active',
      uploaded_by: 12,
      institution_id: 5,
      date_from: '2025-01-01',
      date_to: '2025-01-31',
      my_documents: true,
      sort_by: 'title',
      sort_direction: 'asc',
      per_page: 10,
    });
  });

  it('skips document request when only links are requested', async () => {
    mockedLinkService.getAll.mockResolvedValue({ data: { data: [] } });

    await resourceService.getAll({ type: 'link' });

    expect(mockedLinkService.getAll).toHaveBeenCalledTimes(1);
    expect(mockedDocumentService.getAll).not.toHaveBeenCalled();
  });
});

describe('ResourceService.getStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates link və document statistikalarını birləşdirir', async () => {
    mockedLinkService.getLinkStats.mockResolvedValue({
      total_links: 4,
      recent_links: 1,
      total_clicks: 25,
      by_type: { external: 2, video: 1, form: 1, document: 0 },
    });
    mockedDocumentService.getStats.mockResolvedValue({
      total: 3,
      recent_uploads: 2,
      by_type: { pdf: 2, word: 1, excel: 0, image: 0, other: 0 },
    });

    const stats = await resourceService.getStats();

    expect(stats.total_resources).toBe(7);
    expect(stats.total_links).toBe(4);
    expect(stats.total_documents).toBe(3);
    expect(stats.by_type.links.video).toBe(1);
    expect(stats.by_type.documents.pdf).toBe(2);
  });

  it('forbidden xətasında boş statistikaya geri dönür', async () => {
    const forbiddenError = new Error('links.read forbidden');
    mockedLinkService.getLinkStats.mockImplementation(() => {
      throw forbiddenError;
    });

    const stats = await resourceService.getStats();
    expect(stats.total_resources).toBe(0);
    expect(stats.by_type.links.external).toBe(0);
    expect(stats.by_type.documents.pdf).toBe(0);
  });
});

describe('ResourceService.create & notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates link resources, sends notifications və təmizləyir cache-i', async () => {
    mockedLinkService.create.mockResolvedValue({
      id: 10,
      shared_by: 3,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      title: 'Link',
    });
    const notifySpy = vi
      .spyOn(resourceService as any, 'sendResourceNotifications')
      .mockResolvedValue(undefined);

    const result = await resourceService.create({
      type: 'link',
      title: 'Test Link',
      description: 'desc',
      url: 'https://example.com',
      link_type: 'video',
      share_scope: 'regional',
      target_institutions: [1],
      target_roles: ['teacher'],
      target_departments: [2],
      target_users: [5],
    } as any);

    expect(mockedLinkService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com',
        link_type: 'video',
        target_institutions: [1],
      })
    );
    expect(result.type).toBe('link');
    expect(notifySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_id: 10,
        resource_type: 'link',
        target_institutions: [1],
      })
    );
    expect(mockedLinkService.clearServiceCache).toHaveBeenCalled();
    notifySpy.mockRestore();
  });

  it('creates document resources with düzgün field xəritəsi', async () => {
    mockedDocumentService.uploadDocument.mockResolvedValue({
      id: 20,
      uploaded_by: 9,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      title: 'Doc',
    });
    const notifySpy = vi
      .spyOn(resourceService as any, 'sendResourceNotifications')
      .mockResolvedValue(undefined);

    const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
    const result = await resourceService.create({
      type: 'document',
      title: 'Doc',
      description: 'desc',
      file,
      category: 'report',
      target_institutions: [2],
      target_departments: [3],
      target_roles: ['admin'],
      is_downloadable: true,
      is_viewable_online: false,
      expires_at: '2025-02-01',
    } as any);

    expect(mockedDocumentService.uploadDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        accessible_institutions: [2],
        allowed_roles: ['admin'],
        file,
      })
    );
    expect(result.type).toBe('document');
    expect(notifySpy).toHaveBeenCalled();
    expect(mockedDocumentService.clearServiceCache).toHaveBeenCalled();
    notifySpy.mockRestore();
  });

  it('sendResourceNotifications posts payload və udur xətaları', async () => {
    mockedApiClient.post.mockResolvedValue({});
    const payload = {
      resource_id: 5,
      resource_type: 'link' as const,
      resource_title: 'Link',
      notification_type: 'resource_assigned' as const,
      target_institutions: [1],
    };

    await resourceService.sendResourceNotifications(payload);
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/notifications/resource-assignment',
      expect.objectContaining({
        title: expect.stringContaining('Yeni'),
        related_id: 5,
      })
    );

    mockedApiClient.post.mockRejectedValue(new Error('network'));
    await expect(resourceService.sendResourceNotifications(payload)).resolves.toBeUndefined();
  });
});

describe('ResourceService.getAssignedResources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fallbacks to getAll when qeyri-icazə xətası alınır', async () => {
    mockedApiClient.get.mockRejectedValue(new Error('network fail'));
    const getAllSpy = vi
      .spyOn(resourceService, 'getAll')
      .mockResolvedValue({ data: [{ id: 1 }], meta: { total: 1 } } as any);

    const result = await resourceService.getAssignedResources({ search: 'abc' });

    expect(getAllSpy).toHaveBeenCalledWith({ search: 'abc' }, { allowForbiddenFallback: false });
    expect(result).toEqual([{ id: 1 }]);
    getAllSpy.mockRestore();
  });

  it('links.read forbidden olduqda boş siyahı qaytarır', async () => {
    mockedApiClient.get.mockRejectedValue(new Error('links.read forbidden'));
    const result = await resourceService.getAssignedResources();
    expect(result).toEqual([]);
  });
});
