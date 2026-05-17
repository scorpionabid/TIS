import { apiClient } from '../api';

interface FetchBlobOptions {
  params?: Record<string, unknown>;
  errorMessage?: string;
}

const JSON_MIME_TYPE = 'application/json';

export async function fetchBlob(endpoint: string, options: FetchBlobOptions = {}): Promise<Blob> {
  const { params, errorMessage } = options;

  // Clear any cached responses for this endpoint before requesting a fresh blob
  apiClient.clearCache(endpoint);

  if (params) {
    const cacheKey = `${endpoint}${JSON.stringify(params)}`;
    apiClient.clearCache(cacheKey);
  }

  const response = await apiClient.get<Blob>(endpoint, params, {
    responseType: 'blob',
    cache: false,
  });

  const payload = response.data;

  if (!(payload instanceof Blob)) {
    throw new Error(errorMessage || 'Server returned unsupported file format');
  }

  if (payload.type === JSON_MIME_TYPE) {
    const text = await payload.text();

    try {
      const json = JSON.parse(text);
      throw new Error(json.message || errorMessage || 'Server reported an error while preparing the file');
    } catch {
      throw new Error(errorMessage || 'Server returned invalid file payload');
    }
  }

  return payload;
}
