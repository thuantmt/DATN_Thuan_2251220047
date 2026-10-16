export type AuthRole = 'learner' | 'teacher' | 'admin';
export interface AuthUser { id: string; fullName: string; email: string; role: AuthRole; status: string }
export class ApiError extends Error {
  constructor(public status: number, message: string, public code = '') { super(message); }
}
const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
export async function api<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'include',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new ApiError(0, 'Không kết nối được backend. Vui lòng kiểm tra mạng và máy chủ.'); }
  let payload;
  try { payload = await response.json(); }
  catch { throw new ApiError(response.status, 'Backend trả phản hồi không đúng định dạng.'); }
  if (!response.ok) throw new ApiError(response.status, payload.error?.message || 'Yêu cầu thất bại.', payload.error?.code);
  return payload.data as T;
}
