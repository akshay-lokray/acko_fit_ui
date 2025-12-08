import React from "react";
import type { LucideIcon } from "lucide-react";

interface FeatureItemProps {
  icon: LucideIcon;
  title: string;
  delay: number;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon: Icon, title, delay }) => {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-2.5 rounded-lg border-2 border-emerald-200 bg-emerald-50/30 transition-all duration-200">
        <Icon className="w-5 h-5 text-emerald-600" strokeWidth={2} />
      </div>
      <span className="font-medium text-gray-800 text-sm">{title}</span>
    </div>
  );
};

export default FeatureItem;