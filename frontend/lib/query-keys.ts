export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  zones: {
    all: () => ["hosted-zones"] as const,
    list: (params: object) => ["hosted-zones", "list", params] as const,
    detail: (id: string) => ["hosted-zones", id] as const,
  },
  records: {
    all: (zoneId: string) => ["records", zoneId] as const,
    list: (zoneId: string, params: object) => ["records", zoneId, "list", params] as const,
    detail: (zoneId: string, recordId: string) => ["records", zoneId, recordId] as const,
  },
};
