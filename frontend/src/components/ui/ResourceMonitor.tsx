import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Activity, Cpu, Database, Zap } from 'lucide-react';

export function ResourceMonitor() {
  const [data, setData] = useState(
    Array.from({ length: 20 }, (_, i) => ({
      time: i,
      cpu: 30 + Math.random() * 20,
      memory: 40 + Math.random() * 10,
      latency: 50 + Math.random() * 50
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev.slice(1)];
        const last = newData[newData.length - 1];
        newData.push({
          time: last.time + 1,
          cpu: Math.max(10, Math.min(90, last.cpu + (Math.random() - 0.5) * 20)),
          memory: Math.max(20, Math.min(80, last.memory + (Math.random() - 0.5) * 10)),
          latency: Math.max(20, Math.min(200, last.latency + (Math.random() - 0.5) * 40))
        });
        return newData;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      {/* CPU Monitor */}
      <div className="glass-panel p-4 border border-glass-border">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-text-main">CPU Usage</span>
          </div>
          <span className="text-xs font-mono text-accent">{data[data.length - 1].cpu.toFixed(1)}%</span>
        </div>
        <div className="h-12 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <YAxis domain={[0, 100]} hide />
              <Line type="monotone" dataKey="cpu" stroke="#6366F1" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Memory Monitor */}
      <div className="glass-panel p-4 border border-glass-border">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-text-main">Memory</span>
          </div>
          <span className="text-xs font-mono text-emerald-500">{data[data.length - 1].memory.toFixed(1)}%</span>
        </div>
        <div className="h-12 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <YAxis domain={[0, 100]} hide />
              <Line type="monotone" dataKey="memory" stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latency Monitor */}
      <div className="glass-panel p-4 border border-glass-border">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-text-main">API Latency</span>
          </div>
          <span className="text-xs font-mono text-amber-500">{data[data.length - 1].latency.toFixed(0)}ms</span>
        </div>
        <div className="h-12 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <YAxis domain={[0, 250]} hide />
              <Line type="monotone" dataKey="latency" stroke="#F59E0B" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
