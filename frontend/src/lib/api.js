const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// The diagram endpoints (see backend attachDiagramUrls) return a
// BACKEND-relative path like "/api/questions/:id/diagram?access_token=...",
// the same shape every other apiRequest() call already prefixes with
// API_BASE_URL before fetching. An <img src> tag doesn't go through
// apiRequest at all, so without this the browser resolves that relative
// path against the FRONTEND's own origin (wherever the Vite dev server or
// static host is running) instead of the backend - a silent 404 with
// nothing in the console pointing at why, since a broken <img> just shows
// no image. Every diagramUrl consumer should wrap it in this rather than
// using question.diagramUrl directly as a src.
export function resolveAssetUrl(path) {
  if (!path) return path;
  return `${API_BASE_URL}${path}`;
}

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
  // Own fetch rather than apiRequest() - a successful response here is a
  // binary PDF, not JSON, so apiRequest's `response.text()` -> JSON.parse
  // pipeline would corrupt it. An error response is still plain JSON
  // (see error-handler.js), so that path is handled the same way
  // apiRequest does it.
  async exportMockTestPdf(mockTestId) {
    const { token, workspaceId } = getStoredAuth();
    let response;
    try {
      response = await fetch(
        `${API_BASE_URL}/api/mock-tests/${mockTestId}/pdf-export`,
        {
          method: "POST",
          headers: {
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
          },
        },
      );
    } catch {
      throw new Error(
        `Cannot connect to the backend at ${API_BASE_URL}. Start the backend with: cd backend && npm run dev`,
      );
    }

    if (!response.ok) {
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      throw new Error(data?.error?.message || "Could not generate PDF");
    }

    return response.blob();
  },
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
  // documentType: "questions" (default, PDF already has ready-made MCQs) or
  // "notes" (PDF is study notes - ask the AI to write new questions from it
  // instead of trying to extract questions that don't exist). Passed as a
  // plain form field alongside the file so multer's upload.single('document')
  // still parses the file normally; multer puts non-file fields into req.body.
  uploadMockTestDocument(mockTestId, file, documentType = "questions") {
    const formData = new FormData();
    formData.append("document", file);
    formData.append("documentType", documentType);

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
  publishMockTest(mockTestId) {
    return apiRequest(`/api/mock-tests/${mockTestId}/publish`, {
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
  reorderQuestions(mockTestId, items) {
    return apiRequest(`/api/mock-tests/${mockTestId}/questions/reorder`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    });
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
  // rect: { x, y, width, height } in pixel coordinates against the
  // question's diagramOriginalUrl image (see DiagramCropModal) - the
  // backend crops question_assets.original_storage_path down to this rect
  // and overwrites storage_path with the result.
  updateDiagramCrop(questionId, rect) {
    return apiRequest(`/api/questions/${questionId}/diagram-crop`, {
      method: "PUT",
      body: JSON.stringify(rect),
    });
  },
  // Discards the manual crop and restores storage_path back to the
  // original extraction (padding_pct=0.25) crop.
  resetDiagramCrop(questionId) {
    return apiRequest(`/api/questions/${questionId}/diagram-crop`, {
      method: "DELETE",
    });
  },
  // Part C: manual image insert. Works whether the question currently has
  // no diagram at all or already has one (extracted or manual) - the
  // backend replaces whatever's there. isFormData in apiRequest handles
  // the content-type header, so this is just a plain FormData body.
  uploadDiagramImage(questionId, file) {
    const formData = new FormData();
    formData.append("image", file);
    return apiRequest(`/api/questions/${questionId}/diagram`, {
      method: "POST",
      body: formData,
    });
  },
  updateDiagramPlacement(questionId, placement) {
    return apiRequest(`/api/questions/${questionId}/diagram-placement`, {
      method: "PATCH",
      body: JSON.stringify({ placement }),
    });
  },
  deleteDiagramImage(questionId) {
    return apiRequest(`/api/questions/${questionId}/diagram`, {
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

  // --- Attempts (workspace-authenticated) ---
  startAttempt(mockTestId, topics) {
    // Accepts a single topic string (back-compat with any caller that
    // still passes one), an array of topics for multi-topic practice, or
    // nothing/null/"" meaning "the whole mock test" - matching
    // startAttempt (attempts.service.js#normalizeTopics) treating all of
    // those the same way. Sends one repeated `topics=` query param per
    // topic rather than a single comma-joined value, so a topic name that
    // happens to contain a comma still round-trips correctly.
    const list = Array.isArray(topics)
      ? topics.filter(Boolean)
      : topics
        ? [topics]
        : [];
    const query = list.length
      ? `?${list.map((t) => `topics=${encodeURIComponent(t)}`).join("&")}`
      : "";
    return apiRequest(`/api/mock-tests/${mockTestId}/attempts${query}`, {
      method: "POST",
    });
  },
  listAttemptsForMockTest(mockTestId) {
    return apiRequest(`/api/mock-tests/${mockTestId}/attempts`);
  },
  listMyAttempts() {
    return apiRequest("/api/attempts");
  },
  getAttempt(attemptId) {
    return apiRequest(`/api/attempts/${attemptId}`);
  },
  saveAttemptAnswer(attemptId, questionId, selectedOptionIndexes) {
    return apiRequest(`/api/attempts/${attemptId}/answers/${questionId}`, {
      method: "PUT",
      body: JSON.stringify({ selectedOptionIndexes }),
    });
  },
  submitAttempt(attemptId) {
    return apiRequest(`/api/attempts/${attemptId}/submit`, {
      method: "POST",
    });
  },
  abandonAttempt(attemptId) {
    return apiRequest(`/api/attempts/${attemptId}/abandon`, {
      method: "POST",
    });
  },
  deleteAttempt(attemptId) {
    return apiRequest(`/api/attempts/${attemptId}`, {
      method: "DELETE",
    });
  },

  // --- Share links (workspace-authenticated management) ---
  createShareLink(mockTestId) {
    return apiRequest(`/api/mock-tests/${mockTestId}/share`, {
      method: "POST",
    });
  },
  listShareLinks(mockTestId) {
    return apiRequest(`/api/mock-tests/${mockTestId}/share`);
  },
  revokeShareLink(mockTestId, shareId) {
    return apiRequest(`/api/mock-tests/${mockTestId}/share/${shareId}`, {
      method: "DELETE",
    });
  },
  // Owner-facing: everyone who has taken this mock test, member or guest
  // (via a shared link) - see attempts.service.js#listAllAttemptsForMockTest.
  listSubmissions(mockTestId) {
    return apiRequest(`/api/mock-tests/${mockTestId}/submissions`);
  },

  // --- Public shared-test-taking (no auth - token is the credential) ---
  getSharedMockTest(token) {
    return apiRequest(`/api/shared/${token}`);
  },
  startSharedAttempt(token, guestName) {
    return apiRequest(`/api/shared/${token}/attempts`, {
      method: "POST",
      body: JSON.stringify({ guestName }),
    });
  },
  getSharedAttempt(token, attemptId) {
    return apiRequest(`/api/shared/${token}/attempts/${attemptId}`);
  },
  saveSharedAnswer(token, attemptId, questionId, selectedOptionIndexes) {
    return apiRequest(
      `/api/shared/${token}/attempts/${attemptId}/answers/${questionId}`,
      {
        method: "PUT",
        body: JSON.stringify({ selectedOptionIndexes }),
      },
    );
  },
  submitSharedAttempt(token, attemptId) {
    return apiRequest(`/api/shared/${token}/attempts/${attemptId}/submit`, {
      method: "POST",
    });
  },
  abandonSharedAttempt(token, attemptId) {
    return apiRequest(`/api/shared/${token}/attempts/${attemptId}/abandon`, {
      method: "POST",
    });
  },
  // "Save this result" - links an already-submitted anonymous attempt to
  // the currently logged-in account. Requires auth (unlike every other
  // /api/shared/* call above).
  claimSharedAttempt(token, attemptId) {
    return apiRequest(`/api/shared/${token}/attempts/${attemptId}/claim`, {
      method: "POST",
    });
  },

  // --- Settings (profile, preferences, password, account) ---
  getProfile() {
    return apiRequest("/api/auth/profile");
  },
  updateProfile(payload) {
    return apiRequest("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  updatePreferences(payload) {
    return apiRequest("/api/auth/preferences", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  changePassword(payload) {
    return apiRequest("/api/auth/password", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteAccount(password) {
    return apiRequest("/api/auth/account", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    });
  },

  // --- Team (members + invitations) ---
  listTeamMembers() {
    return apiRequest("/api/team/members");
  },
  updateTeamMemberRole(memberId, role) {
    return apiRequest(`/api/team/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },
  removeTeamMember(memberId) {
    return apiRequest(`/api/team/members/${memberId}`, {
      method: "DELETE",
    });
  },
  listSentInvitations() {
    return apiRequest("/api/team/invitations");
  },
  listMyInvitations() {
    return apiRequest("/api/team/invitations/mine");
  },
  createInvitation(payload) {
    return apiRequest("/api/team/invitations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  revokeInvitation(invitationId) {
    return apiRequest(`/api/team/invitations/${invitationId}`, {
      method: "DELETE",
    });
  },
  acceptInvitation(token) {
    return apiRequest(`/api/team/invitations/${token}/accept`, {
      method: "POST",
    });
  },
};
