"use client";
import { Construction } from "lucide-react";

interface ComingSoonPageProps {
  feature: string;
  description?: string;
}

export function ComingSoonPage({ feature, description }: ComingSoonPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
      <div className="w-20 h-20 bg-aws-orange/10 rounded-full flex items-center justify-center mb-6">
        <Construction className="w-10 h-10 text-aws-orange" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">{feature}</h2>
      <p className="text-gray-500 text-sm max-w-md mb-6">
        {description || "This feature is part of the AWS Route53 console but is not yet available in this clone. Stay tuned!"}
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded px-4 py-2 text-sm text-blue-700 font-medium">
        Coming Soon
      </div>
    </div>
  );
}
