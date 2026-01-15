const API_BASE = "/api";

// Session expired event for UI handling
export const SESSION_EXPIRED_EVENT = "session-expired";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - session expired
    if (response.status === 401) {
      // Dispatch event for UI to handle
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
      throw new Error("Session expired. Please refresh the page.");
    }

    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

export const api = {
  auth: {
    status: () => request<{ needsSetup: boolean }>("/auth/status"),
    me: () =>
      request<{ authenticated: boolean; user?: { id: string; username: string } }>(
        "/auth/me",
      ),
    setup: (password: string) =>
      request<{ success: boolean; user: { id: string; username: string } }>(
        "/auth/setup",
        {
          method: "POST",
          body: JSON.stringify({ password }),
        },
      ),
    login: (password: string) =>
      request<{ success: boolean; user: { id: string; username: string } }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ password }),
        },
      ),
    logout: () => request<{ success: boolean }>("/auth/logout", { method: "POST" }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ success: boolean }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },

  versions: {
    list: () => request<any[]>("/versions"),
    create: (data: any) =>
      request<any>("/versions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/versions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/versions/${id}`, { method: "DELETE" }),
    clone: (id: string, name: string) =>
      request<any>(`/versions/${id}/clone`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
  },

  conversations: {
    list: () => request<any[]>("/conversations"),
    get: (id: string) => request<any>(`/conversations/${id}`),
    create: (versionId: string, title?: string) =>
      request<any>("/conversations", {
        method: "POST",
        body: JSON.stringify({ versionId, title }),
      }),
    update: (id: string, data: any) =>
      request<any>(`/conversations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/conversations/${id}`, { method: "DELETE" }),
    addMessage: (conversationId: string, role: "user" | "assistant", content: string) =>
      request<any>(`/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ role, content }),
      }),
  },

  memories: {
    list: () => request<any[]>("/memories"),
    create: (data: any) =>
      request<any>("/memories", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/memories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/memories/${id}`, { method: "DELETE" }),
  },

  settings: {
    get: () => request<any>("/settings"),
    update: (data: any) =>
      request<any>("/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  chat: {
    complete: (messages: any[], model: string, systemPrompt: string) =>
      request<any>("/chat/completions", {
        method: "POST",
        body: JSON.stringify({
          model,
          system_prompt: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      }),
  },

  diagnostics: {
    get: () => request<any>("/diagnostics"),
  },

  backups: {
    list: () => request<any[]>("/backups"),
    create: (name?: string) =>
      request<any>("/backups", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    export: () => request<any>("/backups/export"),
    delete: (id: string) =>
      request<{ success: boolean }>(`/backups/${id}`, { method: "DELETE" }),
  },
};
