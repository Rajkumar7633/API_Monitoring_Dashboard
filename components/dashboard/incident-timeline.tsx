"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface IncidentAlert {
  kind: "alert";
  id: string;
  service: string | null;
  severity: string | null; // error|warning|info
  message: string | null;
  details: string | null;
  status: string | null;
  ts: number;
}

interface IncidentCheck {
  kind: "service_check";
  id: string;
  service: string;
  status: string; // Healthy|Degraded|Unhealthy
  response_ms: number;
  ts: number;
}

interface ApiResponse {
  hours: number;
  count: number;
  items: (IncidentAlert | IncidentCheck)[];
}

function timeStr(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString();
}

export function IncidentTimeline({ filter }: { filter?: (item: IncidentAlert | IncidentCheck) => boolean }) {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const [hours, setHours] = useState(24);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/incidents", base);
      url.searchParams.set("hours", String(hours));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const id = setInterval(fetchIncidents, 60_000);
    return () => clearInterval(id);
  }, [hours]);

  const groups = useMemo(() => {
    const map = new Map<string, (IncidentAlert | IncidentCheck)[]>();
    const items = (data?.items || []).filter(it => (filter ? filter(it) : true));
    for (const it of items) {
      const d = new Date(it.ts);
      const dayKey = d.toLocaleDateString();
      const arr = map.get(dayKey) || [];
      arr.push(it);
      map.set(dayKey, arr);
    }
    return Array.from(map.entries()).sort((a,b)=> (new Date(b[0]).getTime() - new Date(a[0]).getTime()));
  }, [data]);

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            className="w-24 rounded border bg-background px-2 py-1 text-sm"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
          <span className="text-sm text-muted-foreground">hours</span>
          <Button variant="outline" size="sm" onClick={fetchIncidents}>Refresh</Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : !groups.length ? (
          <div className="text-muted-foreground">No incidents in the selected window.</div>
        ) : (
          <div className="space-y-6">
            {groups.map(([day, items]) => (
              <div key={day}>
                <div className="text-sm font-semibold mb-2">{day}</div>
                <div className="space-y-2">
                  {items.map((it) => (
                    <div key={it.id} className="rounded border p-3 flex items-start justify-between">
                      {it.kind === "alert" ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={it.severity === 'error' ? 'destructive' : it.severity === 'warning' ? 'outline' : 'default'}>
                              {it.severity || 'info'}
                            </Badge>
                            <div className="text-sm font-medium">{(it as any).message}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(it as any).service || 'General'} • {timeStr(it.ts)}
                          </div>
                          {(it as any).details && (
                            <div className="text-xs text-muted-foreground">{(it as any).details}</div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={(it as any).status === 'Unhealthy' ? 'destructive' : (it as any).status === 'Degraded' ? 'outline' : 'default'}>
                              {(it as any).status}
                            </Badge>
                            <div className="text-sm font-medium">{(it as any).service}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Response {(it as any).response_ms}ms • {timeStr(it.ts)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
