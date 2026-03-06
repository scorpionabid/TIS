/**
 * Import Service
 *
 * Excel import and template download API
 */

import { apiClient as api } from '../api';
import type { ImportResult, ImportDataType } from '../../types/teacherRating';

const BASE_URL = '/teacher-rating/import';

export const importService = {
  /**
   * Import awards from Excel
   */
  async importAwards(file: File): Promise<{
    success: boolean;
    message: string;
    data: ImportResult;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`${BASE_URL}/awards`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Import certificates from Excel
   */
  async importCertificates(file: File): Promise<{
    success: boolean;
    message: string;
    data: ImportResult;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`${BASE_URL}/certificates`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Import academic results from Excel
   */
  async importAcademicResults(file: File): Promise<{
    success: boolean;
    message: string;
    data: ImportResult;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`${BASE_URL}/academic-results`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Download Excel template
   */
  async downloadTemplate(type: ImportDataType): Promise<Blob> {
    const response = await api.get(`${BASE_URL}/template/${type}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Generic import function
   */
  async importData(type: ImportDataType, file: File): Promise<{
    success: boolean;
    message: string;
    data: ImportResult;
  }> {
    switch (type) {
      case 'awards':
        return this.importAwards(file);
      case 'certificates':
        return this.importCertificates(file);
      case 'academic-results':
        return this.importAcademicResults(file);
      default:
        throw new Error(`Invalid import type: ${type}`);
    }
  },
};
