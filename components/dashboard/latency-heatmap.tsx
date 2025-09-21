"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface BucketPoint {
  ts: number; // bucket start ms
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

interface ApiResponse {
  endpoint: string;
  hours: number;
  bucketMinutes: number;
  data: BucketPoint[];
}

function formatHour(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function LatencyHeatmap({ endpoint }: { endpoint: string }) {
  const [series, setSeries] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bucket, setBucket] = useState(30); // minutes
  const [hours, setHours] = useState(6);
  const [stat, setStat] = useState<"p95" | "p99">("p95");

  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const ep = endpoint && endpoint !== "all" ? endpoint : "/api/users"; // default representative endpoint

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const url = new URL("/api/series/latency", base);
        url.searchParams.set("endpoint", ep);
        url.searchParams.set("range", String(hours));
        url.searchParams.set("bucket", String(bucket));
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ApiResponse = await res.json();
        if (!cancelled) setSeries(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load latency series");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    const id = setInterval(fetchData, 30_000); // refresh every 30s
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [ep, hours, bucket, base]);

  const points = series?.data || [];
  const maxValue = useMemo(() => {
    if (!points.length) return 0;
    return points.reduce((m, p) => Math.max(m, stat === "p95" ? p.p95 : p.p99), 0);
  }, [points, stat]);

  const colorFor = (value: number) => {
    if (maxValue <= 0) return "#0f172a"; // slate-900
    // simple scale: green->amber->red
    const ratio = Math.min(1, value / maxValue);
    const r = Math.round(16 + ratio * 200);
    const g = Math.round(160 - ratio * 120);
    const b = 80;
    return `rgb(${r},${g},${b})`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latency Heatmap</CardTitle>
        <CardDescription>Bucketed {stat.toUpperCase()} latency for {ep} over last {hours}h</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <Select value={stat} onValueChange={(v) => setStat(v as any)}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Stat" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="p95">P95</SelectItem>
              <SelectItem value="p99">P99</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Range" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3h</SelectItem>
              <SelectItem value="6">Last 6h</SelectItem>
              <SelectItem value="12">Last 12h</SelectItem>
              <SelectItem value="24">Last 24h</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(bucket)} onValueChange={(v) => setBucket(Number(v))}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Bucket" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 min buckets</SelectItem>
              <SelectItem value="30">30 min buckets</SelectItem>
              <SelectItem value="60">60 min buckets</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : !points.length ? (
          <div className="text-muted-foreground">No data available yet for {ep}. Generate load or wait for traffic.</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid" style={{ gridTemplateColumns: `repeat(${points.length}, 1fr)` }}>
                {points.map((p) => (
                  <div key={p.ts} className="flex flex-col items-center mx-[1px]">
                    <div
                      className="w-6 sm:w-8 md:w-10 h-24 rounded"
                      title={`${formatHour(p.ts)}\nP95: ${p.p95}ms\nP99: ${p.p99}ms\nCount: ${p.count}`}
                      style={{ backgroundColor: colorFor(stat === "p95" ? p.p95 : p.p99) }}
                    />
                    <div className="text-[10px] text-muted-foreground mt-1">{formatHour(p.ts)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
