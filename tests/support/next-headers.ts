// Test double for `next/headers`, aliased in vitest.config.ts so both the test
// and next-auth resolve to this one module. Tests write `request`, and code
// under test reads it as though it were the incoming HTTP request.
export type WrittenCookie = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

export const request = { cookie: "", written: [] as WrittenCookie[] };

export async function headers() {
  return new Headers({
    ...(request.cookie ? { cookie: request.cookie } : {}),
    host: "localhost:3000",
    "x-forwarded-proto": "http",
  });
}

export async function cookies() {
  return {
    get: (name: string) => {
      const match = request.cookie
        .split("; ")
        .find((entry) => entry.startsWith(`${name}=`));
      return match ? { name, value: match.slice(name.length + 1) } : undefined;
    },
    getAll: () => [],
    has: (name: string) => request.cookie.includes(`${name}=`),
    // signOut() writes the cleared session cookie through this jar.
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      request.written.push({ name, value, options });
    },
    delete: (name: string) => {
      request.written.push({ name, value: "" });
    },
  };
}
