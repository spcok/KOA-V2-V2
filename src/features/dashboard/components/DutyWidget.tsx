import React, { useState } from 'react';
import { ClipboardList, HeartPulse, ChevronUp, ChevronDown, CheckCircle2, Heart } from 'lucide-react';
import clsx from 'clsx';

interface DutyWidgetProps {
  title: string;
  count: number;
  type: 'duties' | 'health';
  statusText: string;
}

export function DutyWidget({ title, count, type, statusText }: DutyWidgetProps) {
  const isHealth = type === 'health';
  
  const [dutiesExpanded, setDutiesExpanded] = useState(true);
  const [healthExpanded, setHealthExpanded] = useState(true);

  const isExpanded = isHealth ? healthExpanded : dutiesExpanded;
  const toggleExpanded = () => {
    if (isHealth) {
      setHealthExpanded(!healthExpanded);
    } else {
      setDutiesExpanded(!dutiesExpanded);
    }
  };

  return (
    <div className={clsx("bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col transition-all duration-200", isExpanded ? "h-40" : "h-[68px]")}>
      <div 
        className="flex justify-between items-start mb-auto cursor-pointer group"
        onClick={toggleExpanded}
      >
        <div className="flex items-center gap-2">
          {isHealth ? (
            <HeartPulse className="w-5 h-5 text-rose-500" />
          ) : (
            <ClipboardList className="w-5 h-5 text-blue-500" />
          )}
          <h3 className="font-semibold text-slate-800">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full", isHealth ? "bg-rose-100 text-rose-700" : "bg-blue-50 text-blue-700")}>
            {count}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="flex flex-col items-center justify-center gap-2 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", isHealth ? "bg-rose-50" : "bg-emerald-50")}>
            {isHealth ? (
              <Heart className="w-5 h-5 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            )}
          </div>
          <span className="text-xs text-slate-500 font-medium">{statusText}</span>
        </div>
      )}
    </div>
  );
}
