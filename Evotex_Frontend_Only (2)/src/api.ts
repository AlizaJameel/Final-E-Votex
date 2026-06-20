import axios, { AxiosError } from 'axios';
import { cnicToDigits, isValidCnic } from './utils/cnic';

import imranImg from './assets/candidates/imran-khan.jpg';
import nawazImg from './assets/candidates/nawaz-sharif.jpg';
import bilawalImg from './assets/candidates/bilawal-bhutto.jpg';

export const GENERAL_ELECTION_ID = 1;

const CANDIDATE_PHOTO_MAP: Record<string, string> = {
  'Imran Khan': imranImg,
  'Nawaz Sharif': nawazImg,
  'Bilawal Bhutto': bilawalImg,
};

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('evotex_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type CandidateRecord = {
  name: string;
  photoUrl?: string;
  [key: string]: unknown;
};

type ElectionRecord = {
  candidates?: CandidateRecord[];
  [key: string]: unknown;
};

function resolveCandidatePhoto(name: string, photoUrl?: string): string {
  if (photoUrl && photoUrl.length > 0) return photoUrl;
  return CANDIDATE_PHOTO_MAP[name] ?? '';
}

function enrichCandidates(candidates: CandidateRecord[]): CandidateRecord[] {
  return candidates.map((candidate) => ({
    ...candidate,
    photoUrl: resolveCandidatePhoto(candidate.name, candidate.photoUrl),
  }));
}

function enrichElectionPayload(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;

  const record = data as ElectionRecord;
  if (!Array.isArray(record.candidates)) return data;

  return {
    ...record,
    candidates: enrichCandidates(record.candidates),
  };
}

function shouldEnrichElection(url: string): boolean {
  return (
    /^\/elections\/\d+$/.test(url) ||
    /^\/elections\/\d+\/results$/.test(url) ||
    /^\/admin\/elections\/\d+$/.test(url)
  );
}

function apiError(message: string, status = 400): never {
  const error = new AxiosError(message, String(status), undefined, undefined, {
    data: { message },
    status,
    statusText: message,
    headers: {},
    config: {} as never,
  });
  throw error;
}

function validateCnic(cnic: unknown): void {
  const value = String(cnic ?? '').trim();
  if (!isValidCnic(value) || cnicToDigits(value).length !== 13) {
    apiError('Invalid CNIC format. Use XXXXX-XXXXXXX-X.');
  }
}

const api = {
  get: async (url: string) => {
    const response = await http.get(url);
    if (shouldEnrichElection(url)) {
      response.data = enrichElectionPayload(response.data);
    }
    return response;
  },

  post: async (url: string, data?: unknown) => {
    if (url === '/votes') {
      const payload = data as { cnic?: string } | undefined;
      validateCnic(payload?.cnic);
    }

    const response = await http.post(url, data);

    if (url === '/votes') {
      const payload = data as { cnic?: string } | undefined;
      if (payload?.cnic) {
        updateSessionCnic(String(payload.cnic).trim());
      }
    }

    return response;
  },

  put: async (url: string, data?: unknown) => {
    if (url === '/auth/profile') {
      const payload = data as { cnic?: string } | undefined;
      if (payload?.cnic !== undefined) {
        validateCnic(payload.cnic);
      }
    }

    const response = await http.put(url, data);

    if (url === '/auth/profile') {
      const user = response.data as SessionUser | undefined;
      if (user) setSessionUser(user);
    }

    return response;
  },

  delete: async (url: string) => {
    return http.delete(url);
  },
};

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  cnic: string;
  status: string;
  createdAt?: string;
};

export function getSessionUser(): SessionUser | null {
  try {
    const u = localStorage.getItem('evotex_user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

export function setSessionUser(user: SessionUser) {
  localStorage.setItem('evotex_user', JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('evotex-user-updated', { detail: user }));
}

/** Persist CNIC for the logged-in voter (session + voter record when applicable). */
export function updateSessionCnic(cnic: string) {
  const session = getSessionUser();
  if (!session) return;
  const updated = { ...session, cnic };
  setSessionUser(updated);
}

export function setAuthToken(token: string | null, role?: string, user?: SessionUser) {
  if (token) {
    localStorage.setItem('evotex_token', token);
    localStorage.setItem('evotex_role', role || 'voter');
    if (user) setSessionUser(user);
  } else {
    localStorage.removeItem('evotex_token');
    localStorage.removeItem('evotex_role');
    localStorage.removeItem('evotex_user');
  }
}

export default api;
