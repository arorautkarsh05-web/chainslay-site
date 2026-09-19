import api from './api';

export const inventoryApi = {
  getAll: (params?: any) => api.get('/inventory', { params }),
  getById: (id: string) => api.get(`/inventory/${id}`),
  getBySku: (sku: string) => api.get(`/inventory/sku/${sku}`),
};

export const uploadApi = {
  uploadFile: (file: File, onUploadProgress?: (progressEvent: any) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/uploads', formData, {
      onUploadProgress,
    });
  },
  getHistory: () => api.get('/uploads'),
  getDetails: (id: string) => api.get(`/uploads/${id}`),
};

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
  getAlerts: () => api.get('/dashboard/alerts'),
};

export const analyticsApi = {
  getSegmentation: () => api.get('/analytics/segmentation'),
  getSummary: () => api.get('/analytics/summary'),
};

export const approvalApi = {
  getPending: () => api.get('/approvals', { params: { status: 'PENDING' } }),
  createRequest: (data: any) => api.post('/approvals', data),
  approve: (id: string) => api.put(`/approvals/${id}/approve`),
  reject: (id: string) => api.put(`/approvals/${id}/reject`),
};

export const blockchainApi = {
  getLogs: () => api.get('/blockchain/logs'),
};

export const festivalApi = {
  getCalendar: () => api.get('/festivals/calendar'),
  getRecommendations: (params?: any) => api.get('/festivals/recommendations', { params }),
  getSummary: (params?: any) => api.get('/festivals/summary', { params }),
  createReorderApproval: (data: any) => api.post('/festivals/reorder-approval', data),
};

