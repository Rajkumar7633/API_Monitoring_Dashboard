"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface SloSummary {
  endpoint: string;
  windowHours: number;
  totals: { total: number; errors: number };
  availability: number;
  availabilityTarget: number;
  errorBudgetRemaining: number;
  errorBudgetUsedPct: number;
  latency: { p95: number; p99: number; targetP95: number; compliant: boolean };
}

export function SloSummary({ endpoint }: { endpoint: string }) {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const ep = endpoint && endpoint !== "all" ? endpoint : "/api/users";

  const [hours, setHours] = useState(24);
  const [targetAvail, setTargetAvail] = useState(99.9);
  const [targetP95, setTargetP95] = useState(400);
  const [data, setData] = useState<SloSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/slo/summary", base);
      url.searchParams.set("endpoint", ep);
      url.searchParams.set("hours", String(hours));
      url.searchParams.set("availabilityTarget", String(targetAvail));
      url.searchParams.set("latencyP95TargetMs", String(targetP95));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: SloSummary = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to load SLO summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // refresh every 60s
    const id = setInterval(fetchSummary, 60_000);
    return () => clearInterval(id);
  }, [ep, hours, targetAvail, targetP95]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>SLO Summary</CardTitle>
        <CardDescription>Endpoint {ep} over last {hours}h</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Window (hours)</label>
            <Input type="number" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Availability Target (%)</label>
            <Input type="number" value={targetAvail} onChange={(e) => setTargetAvail(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Latency Target P95 (ms)</label>
            <Input type="number" value={targetP95} onChange={(e) => setTargetP95(Number(e.target.value))} />
          </div>
          <div className="flex items-end">
            <Button onClick={fetchSummary}>Recalculate</Button>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        ) : error ? (
          <div className="mt-4 text-destructive">{error}</div>
        ) : !data ? (
          <div className="mt-4 text-muted-foreground">No data.</div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Availability</div>
              <div className="text-lg font-semibold">
                {data.availability.toFixed(3)}% <span className="text-xs text-muted-foreground">(target {data.availabilityTarget}%)</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {data.totals.errors}/{data.totals.total} errors | Budget used {data.errorBudgetUsedPct.toFixed(2)}%
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Latency</div>
              <div className="text-lg font-semibold">
                P95 {data.latency.p95}ms | P99 {data.latency.p99}ms
              </div>
              <div className="text-xs" style={{ color: data.latency.compliant ? "#16a34a" : "#dc2626" }}>
                {data.latency.compliant ? "Meets target" : `Exceeds target ${data.latency.targetP95}ms`}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Error Budget Remaining</div>
              <div className="text-lg font-semibold">{data.errorBudgetRemaining.toFixed(3)}%</div>
              <div className="text-xs text-muted-foreground">Used {data.errorBudgetUsedPct.toFixed(2)}%</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
