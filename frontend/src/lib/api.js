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
const SUBSCRIBER_KEY = "paperflow_subscriber_key";

export function getSubscriberKey() {
  let key = localStorage.getItem(SUBSCRIBER_KEY);
  if (!key) {
    key = `sub_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    localStorage.setItem(SUBSCRIBER_KEY, key);
  }
  return key;
}

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
  const subscriberKey = getSubscriberKey();
  const isFormData = options.body instanceof FormData;
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(!isFormData ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
        ...(subscriberKey ? { "x-subscriber-key": subscriberKey } : {}),
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
  // Workspace-wide (unlike listMockTests above, which is cluster-scoped)
  // - GET /api/mock-tests, already returns cluster_name joined in (see
  // mock-tests.repository.js#listMockTests). Used by AddToTestModal's
  // target-mock-test picker, which needs to search across every mock
  // test in the workspace, not just one cluster at a time.
  listAllMockTests() {
    return apiRequest("/api/mock-tests");
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
  getMockTestSummary(mockTestId) {
    return apiRequest(`/api/mock-tests/${mockTestId}/summary`);
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
  cancelProcessing(mockTestId) {
    return apiRequest(`/api/mock-tests/${mockTestId}/cancel-processing`, {
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
  bulkUpdateQuestionStatus(questionIds, status) {
    return apiRequest("/api/questions/bulk-status", {
      method: "PATCH",
      body: JSON.stringify({ questionIds, status }),
    });
  },
  // filters: { clusterId, mockTestId, maxConfidence, hasAiIssues, sort,
  // cursor, limit } - all optional, dropped from the query string when
  // undefined/null/empty rather than sent as literal "undefined" strings.
  getReviewQueue(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value);
      }
    });
    const query = params.toString();
    return apiRequest(`/api/review-queue${query ? `?${query}` : ""}`);
  },
  getReviewQueueCount(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value);
      }
    });
    const query = params.toString();
    return apiRequest(`/api/review-queue/count${query ? `?${query}` : ""}`);
  },
  deleteQuestion(questionId) {
    return apiRequest(`/api/questions/${questionId}`, {
      method: "DELETE",
    });
  },
  // rect: { x, y, width, height } in pixel coordinates against the
  // question's current diagramUrl image (see DiagramCropModal). The
  // backend crops question_assets.storage_path down to this rect and
  // overwrites it in place - there's only one stored image per diagram
  // (migration 022_diagram_single_image.sql), so a second crop starts
  // from the first crop's result, not a separately preserved original.
  // There is deliberately no "reset to original" call anymore - nothing
  // is kept to reset to.
  updateDiagramCrop(questionId, rect) {
    return apiRequest(`/api/questions/${questionId}/diagram-crop`, {
      method: "PUT",
      body: JSON.stringify(rect),
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

  // --- Question Bank ---
  // params: { search, topic, subtopic, hasCode, hasDiagram, status,
  // questionType, clusterId, cursor, limit } - all optional, filtered out
  // below rather than sent as literal "undefined" query-string values.
  searchQuestionBank(params = {}) {
    const searchParams = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(
          ([, value]) => value !== undefined && value !== null && value !== "",
        ),
      ),
    );
    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiRequest(`/api/question-bank${suffix}`);
  },
  listQuestionBankTopics() {
    return apiRequest("/api/question-bank/topics");
  },
  copyQuestionToMockTest(questionId, targetMockTestId) {
    return apiRequest(`/api/question-bank/${questionId}/copy`, {
      method: "POST",
      body: JSON.stringify({ targetMockTestId }),
    });
  },
  // Returns { copied: [...], failed: [{questionId, message}] } - a mixed
  // result, not a single success/failure, so the caller can tell someone
  // exactly which of their selected questions didn't make it (and why)
  // rather than an opaque "some failed" for the whole batch.
  copyQuestionsToMockTestBulk(questionIds, targetMockTestId) {
    return apiRequest("/api/question-bank/copy-bulk", {
      method: "POST",
      body: JSON.stringify({ questionIds, targetMockTestId }),
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
  // --- Duplicate question review ---
  listDuplicates() {
    return apiRequest("/api/duplicates");
  },
  countPendingDuplicates() {
    return apiRequest("/api/duplicates/count");
  },
  resolveDuplicate(pairId, { action, keepQuestionId }) {
    return apiRequest(`/api/duplicates/${pairId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ action, keepQuestionId }),
    });
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
  getSharedMockTest(token, topics) {
    // Same normalization as startAttempt above - accepts an array, a
    // single string, or nothing.
    const list = Array.isArray(topics)
      ? topics.filter(Boolean)
      : topics
        ? [topics]
        : [];
    const query = list.length
      ? `?${list.map((t) => `topics=${encodeURIComponent(t)}`).join("&")}`
      : "";
    return apiRequest(`/api/shared/${token}${query}`);
  },
  startSharedAttempt(token, guestName, guestEmail, topics) {
    const list = Array.isArray(topics)
      ? topics.filter(Boolean)
      : topics
        ? [topics]
        : [];
    return apiRequest(`/api/shared/${token}/attempts`, {
      method: "POST",
      body: JSON.stringify({ guestName, guestEmail, topics: list }),
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

  // --- Students (roster, built from taker_email on exam_attempts) ---
  listStudents(search, cohortId) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (cohortId) params.set("cohortId", cohortId);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiRequest(`/api/students${query}`);
  },
  getStudentDetail(email) {
    return apiRequest(`/api/students/${encodeURIComponent(email)}`);
  },

  getWeakTopics(cohortId) {
    const query = cohortId ? `?cohortId=${encodeURIComponent(cohortId)}` : "";
    return apiRequest(`/api/students/weak-topics${query}`);
  },

  // --- Cohorts (Phase 2 - manual grouping of students) ---
  listCohorts() {
    return apiRequest(`/api/cohorts`);
  },
  createCohort(name) {
    return apiRequest(`/api/cohorts`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },
  listCohortMembers(cohortId) {
    return apiRequest(`/api/cohorts/${cohortId}/members`);
  },
  addCohortMember(cohortId, email) {
    return apiRequest(`/api/cohorts/${cohortId}/members`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
  removeCohortMember(cohortId, email) {
    return apiRequest(
      `/api/cohorts/${cohortId}/members/${encodeURIComponent(email)}`,
      { method: "DELETE" },
    );
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

  // --- Public Test Catalog admin settings (workspace slug + listing) ---
  getWorkspaceCatalogSettings() {
    return apiRequest("/api/workspace-catalog");
  },
  updateWorkspacePublicSlug(slug) {
    return apiRequest("/api/workspace-catalog/slug", {
      method: "PUT",
      body: JSON.stringify({ slug }),
    });
  },

  // --- Public Test Catalog (unauthenticated - students browsing/searching) ---
  // Global feed, no institute in mind - the default "Public Mock Tests"
  // tab on PublicCatalog.jsx. Each row already carries its own
  // workspaceSlug (see catalog.repository.js#listAllPublicMockTests), so
  // starting an attempt from here uses that row's slug with the same
  // startCatalogAttempt below - no separate "global start" endpoint.
  getGlobalPublicCatalog({ search, examYear } = {}) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (examYear) params.set("examYear", examYear);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiRequest(`/api/catalog${query}`);
  },
  getGlobalPublicCatalogExamYears() {
    return apiRequest("/api/catalog/exam-years");
  },
  getPublicCatalog(slug, { search, examYear } = {}) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (examYear) params.set("examYear", examYear);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiRequest(`/api/catalog/${slug}${query}`);
  },
  getPublicCatalogExamYears(slug) {
    return apiRequest(`/api/catalog/${slug}/exam-years`);
  },
  // Full detail (marking scheme, per-topic question counts) for the
  // details card opened from a catalog card click - see
  // components/catalog/MockTestDetailModal.jsx. slug omitted -> global
  // mode lookup (same "doesn't need an institute in mind" shape as
  // getGlobalPublicCatalog above); slug given -> scoped to that
  // institute, same pair as getPublicCatalog/getGlobalPublicCatalog.
  getPublicCatalogMockTest(mockTestId, slug) {
    return apiRequest(
      slug
        ? `/api/catalog/${slug}/mock-tests/${mockTestId}`
        : `/api/catalog/mock-tests/${mockTestId}`,
    );
  },
  startCatalogAttempt(slug, mockTestId) {
    return apiRequest(`/api/catalog/${slug}/mock-tests/${mockTestId}/start`, {
      method: "POST",
    });
  },

  // --- Subscriptions ---
  getSubscriptions() {
    return apiRequest("/api/catalog/subscriptions");
  },
  subscribePublisher(slug) {
    return apiRequest("/api/catalog/subscriptions", {
      method: "POST",
      body: JSON.stringify({ slug }),
    });
  },
  unsubscribePublisher(slug) {
    return apiRequest(
      `/api/catalog/subscriptions/${encodeURIComponent(slug)}`,
      {
        method: "DELETE",
      },
    );
  },
};
