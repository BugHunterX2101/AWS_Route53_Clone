export type RecordType = "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "NS" | "PTR" | "SRV" | "CAA";
export type RoutingPolicy = "SIMPLE" | "WEIGHTED";

export interface DnsRecord {
  id: string;
  hosted_zone_id: string;
  name: string;
  type: RecordType;
  ttl: number;
  values: (string | Record<string, unknown>)[];
  routing_policy: RoutingPolicy;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface DnsRecordCreate {
  name: string;
  type: RecordType;
  ttl: number;
  values: (string | Record<string, unknown>)[];
  routing_policy?: RoutingPolicy;
}

export interface DnsRecordUpdate {
  ttl?: number;
  values?: (string | Record<string, unknown>)[];
  routing_policy?: RoutingPolicy;
}

export const RECORD_TYPES: RecordType[] = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"];
