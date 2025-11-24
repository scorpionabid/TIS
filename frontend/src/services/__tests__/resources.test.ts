import { describe, expect, it, beforeEach, vi } from 'vitest';

import { resourceService } from '@/services/resources';
import { linkService } from '@/services/links';
import { documentService } from '@/services/documents';

vi.mock('@/services/links', () => ({
  linkService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    accessLink: vi.fn(),
    clearServiceCache: vi.fn(),
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
  },
}));

const mockedLinkService = linkService as unknown as {
  getAll: ReturnType<typeof vi.fn>;
};

const mockedDocumentService = documentService as unknown as {
  getAll: ReturnType<typeof vi.fn>;
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
