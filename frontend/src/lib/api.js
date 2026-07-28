const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const TOKEN_KEY = "paperflow_token";
const WORKSPACE_KEY = "paperflow_workspace_id";

export function getStoredAuth() {
  return {
    token: localStorage.getItem(TOKEN_KEY),
    workspaceId: localStorage.getItem(WORKSPACE_KEY),
  };
}

export function storeAuth({ token, workspaceId }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(WORKSPACE_KEY, workspaceId);
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(WORKSPACE_KEY);
}

export async function apiRequest(path, options = {}) {
  const { token, workspaceId } = getStoredAuth();
  const isFormData = options.body instanceof FormData;
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(!isFormData ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      `Cannot connect to the backend at ${API_BASE_URL}. Start the backend with: cd backend && npm run dev`,
    );
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error?.message || "Request failed");
  }

  return data;
}

export const api = {
  signup(payload) {
    return apiRequest("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  login(payload) {
    return apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  me() {
    return apiRequest("/api/auth/me");
  },
  listClusters() {
    return apiRequest("/api/clusters");
  },
  createCluster(payload) {
    return apiRequest("/api/clusters", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateCluster(clusterId, payload) {
    return apiRequest(`/api/clusters/${clusterId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteCluster(clusterId) {
    return apiRequest(`/api/clusters/${clusterId}`, {
      method: "DELETE",
    });
  },
  getCluster(clusterId) {
    return apiRequest(`/api/clusters/${clusterId}`);
  },
  listMockTests(clusterId) {
    return apiRequest(`/api/clusters/${clusterId}/mock-tests`);
  },
  createMockTest(clusterId, payload) {
    return apiRequest(`/api/clusters/${clusterId}/mock-tests`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  uploadMockTestDocument(mockTestId, file) {
    const formData = new FormData();
    formData.append("document", file);

    return apiRequest(`/api/mock-tests/${mockTestId}/upload`, {
      method: "POST",
      body: formData,
    });
  },
  getMockTest(mockTestId) {
    return apiRequest(`/api/mock-tests/${mockTestId}`);
  },
  updateMockTest(mockTestId, payload) {
    return apiRequest(`/api/mock-tests/${mockTestId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  reprocessMockTest(mockTestId) {
    return apiRequest(`/api/mock-tests/${mockTestId}/reprocess`, {
      method: "POST",
    });
  },
  deleteMockTest(mockTestId) {
    return apiRequest(`/api/mock-tests/${mockTestId}`, {
      method: "DELETE",
    });
  },
  listQuestions(mockTestId) {
    return apiRequest(`/api/mock-tests/${mockTestId}/questions`);
  },
  createQuestion(payload) {
    return apiRequest("/api/questions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateQuestion(questionId, payload) {
    return apiRequest(`/api/questions/${questionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteQuestion(questionId) {
    return apiRequest(`/api/questions/${questionId}`, {
      method: "DELETE",
    });
  },
  getPlayableMockTest(mockTestId) {
    return apiRequest(`/api/mock-tests/${mockTestId}/play`);
  },
  listProcessingJobs(params = {}) {
    const searchParams = new URLSearchParams(params);
    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiRequest(`/api/processing-jobs${suffix}`);
  },
  getDashboardSummary() {
    return apiRequest("/api/dashboard/summary");
  },
  listExtractionTemplates(params = {}) {
    const searchParams = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
    );
    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiRequest(`/api/extraction-templates${suffix}`);
  },
  getExtractionTemplate(templateId) {
    return apiRequest(`/api/extraction-templates/${templateId}`);
  },
  createExtractionTemplate(payload) {
    return apiRequest("/api/extraction-templates", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateExtractionTemplate(templateId, payload) {
    return apiRequest(`/api/extraction-templates/${templateId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteExtractionTemplate(templateId) {
    return apiRequest(`/api/extraction-templates/${templateId}`, {
      method: "DELETE",
    });
  },
  applyExtractionTemplate(templateId, payload) {
    return apiRequest(`/api/extraction-templates/${templateId}/apply`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
