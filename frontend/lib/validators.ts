import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const hostedZoneSchema = z.object({
  domain_name: z
    .string()
    .min(1, "Domain name is required")
    .regex(
      /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+([a-zA-Z]{2,}\.?)$/,
      "Must be a valid domain name (e.g., example.com)"
    ),
  type: z.enum(["PUBLIC", "PRIVATE"]),
  comment: z.string().optional(),
});

const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
const ipv6Regex = /^[0-9a-fA-F:]+$/;

export const dnsRecordSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"]),
  ttl: z.number().int().min(0).max(172800),
  values: z.array(z.any()).min(1, "At least one value is required"),
  routing_policy: z.enum(["SIMPLE", "WEIGHTED"]).optional().default("SIMPLE"),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type HostedZoneForm = z.infer<typeof hostedZoneSchema>;
export type DnsRecordForm = z.infer<typeof dnsRecordSchema>;
