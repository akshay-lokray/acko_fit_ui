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
      className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-3 rounded-lg bg-purple-50 transition-all duration-200 group-hover:scale-110">
        <Icon className="w-6 h-6 text-purple-700" />
      </div>
      <span className="font-medium text-gray-700">{title}</span>
    </div>
  );
};

export default FeatureItem;