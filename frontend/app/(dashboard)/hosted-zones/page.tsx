import { HostedZonesTable } from "@/components/zones/HostedZonesTable";

export const metadata = {
  title: "Hosted Zones | Route53 Console",
};

export default function HostedZonesPage() {
  return <HostedZonesTable />;
}
