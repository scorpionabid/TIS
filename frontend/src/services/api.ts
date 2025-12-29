// Re-export the optimized API client with backward compatibility
export * from "./apiOptimized";
export { apiClient } from "./apiOptimized";

// Default export for backward compatibility
export { apiClient as default } from "./apiOptimized";
