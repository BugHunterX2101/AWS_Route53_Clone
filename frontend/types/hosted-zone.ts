export interface HostedZone {
  id: string;
  domain_name: string;
  type: "PUBLIC" | "PRIVATE";
  comment?: string;
  record_count: number;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface HostedZoneCreate {
  domain_name: string;
  type: "PUBLIC" | "PRIVATE";
  comment?: string;
}

export interface HostedZoneUpdate {
  comment?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
