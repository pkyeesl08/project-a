/** API 응답 래퍼 */
export const ok = <T>(data: T) => ({ success: true as const, data });
export const fail = (code: string, message: string) => ({
  success: false as const,
  error: { code, message },
});
