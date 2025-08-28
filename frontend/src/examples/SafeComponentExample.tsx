import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { ErrorHandler } from '@/utils/errorHandler';
import { safeExtractArray, isValidResponse } from '@/utils/typeGuards';
import { performanceMonitor } from '@/utils/performance';
import { apiClient } from '@/services/api';

/**
 * TEMPLATE COMPONENT - Phase 1: Foundation Strengthening
 * 
 * This component demonstrates how to use new utilities in future implementations.
 * DO NOT replace existing components - this is for NEW components only.
 * 
 * Usage of utilities:
 * ✅ Production-safe logging with logger
 * ✅ Comprehensive error handling with ErrorHandler
 * ✅ Runtime type checking with typeGuards
 * ✅ Performance monitoring with performanceMonitor
 */

interface DataItem {
  id: number;
  name: string;
  status: string;
}

interface SafeComponentProps {
  apiEndpoint: string;
  itemsPerPage?: string;
}

export const SafeComponentExample: React.FC<SafeComponentProps> = ({ 
  apiEndpoint, 
  itemsPerPage = '10' 
}) => {
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [apiEndpoint]);

  const loadData = async () => {
    // ✅ Using logger for debugging
    logger.debug('Loading data from API', {
      component: 'SafeComponentExample',
      action: 'loadData',
      data: { apiEndpoint, itemsPerPage }
    });

    setLoading(true);
    setError(null);

    try {
      // ✅ Using performance monitoring
      const result = await performanceMonitor.measureAsync(
        'SafeComponent.loadData',
        async () => {
          const response = await apiClient.get(apiEndpoint, {
            per_page: itemsPerPage
          });
          return response;
        },
        { endpoint: apiEndpoint, itemsPerPage }
      );

      // ✅ Using type guards for safe data extraction
      if (!isValidResponse(result)) {
        throw new Error('Invalid API response structure');
      }

      const extractedData = safeExtractArray<DataItem>(result);
      
      // ✅ Additional safety check
      if (!Array.isArray(extractedData)) {
        logger.warn('Data extraction returned non-array', {
          component: 'SafeComponentExample',
          action: 'loadData',
          data: { extractedData, originalResponse: result }
        });
      }

      setData(extractedData);
      
      // ✅ Success logging
      logger.info(`Successfully loaded ${extractedData.length} items`, {
        component: 'SafeComponentExample',
        action: 'loadData'
      });

    } catch (err) {
      // ✅ Using ErrorHandler for consistent error handling
      const errorMessage = ErrorHandler.handleApiError(err, {
        component: 'SafeComponentExample',
        action: 'loadData',
        additionalInfo: { apiEndpoint, itemsPerPage }
      });
      
      setError(errorMessage);
      setData([]); // Safe fallback
    } finally {
      setLoading(false);
    }
  };

  const handleItemAction = async (item: DataItem) => {
    try {
      // ✅ Using logger for user actions
      logger.authAction('item_action', { itemId: item.id, itemName: item.name });

      await performanceMonitor.measureAsync(
        'SafeComponent.itemAction',
        async () => {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 500));
        },
        { itemId: item.id }
      );

      logger.info('Item action completed successfully');
      
    } catch (err) {
      const errorMessage = ErrorHandler.handleApiError(err, {
        component: 'SafeComponentExample',
        action: 'handleItemAction',
        additionalInfo: { itemId: item.id }
      });
      
      setError(errorMessage);
    }
  };

  // ✅ Safe rendering with proper error boundaries
  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
        <h3 className="text-red-800 font-semibold mb-2">Xəta baş verdi</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={loadData}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Yenidən cəhd et
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Yüklənir...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Safe Component Example</h2>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Yenilə
        </button>
      </div>

      {/* ✅ Safe data rendering with proper checks */}
      {Array.isArray(data) && data.length > 0 ? (
        <div className="space-y-2">
          {data.map((item) => (
            <div 
              key={item.id} 
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{item.name || 'Adı yoxdur'}</h3>
                  <span className="text-sm text-gray-600">
                    Status: {item.status || 'Məlum deyil'}
                  </span>
                </div>
                <button
                  onClick={() => handleItemAction(item)}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Əməliyyat
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Heç bir məlumat tapılmadı</p>
        </div>
      )}

      {/* ✅ Development-only debugging information */}
      {import.meta.env.MODE === 'development' && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
          <strong>Debug Info:</strong>
          <pre className="mt-1">
            {JSON.stringify({ 
              apiEndpoint, 
              itemsPerPage, 
              dataCount: data.length,
              hasError: !!error 
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};