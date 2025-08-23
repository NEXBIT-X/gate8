"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

function isoToLocalDatetimeInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // YYYY-MM-DDTHH:MM
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default function TestDurationEditor({ testId, initialDuration, initialStart, initialEnd, onSaved }: { testId: string; initialDuration: number; initialStart?: string | null; initialEnd?: string | null; onSaved?: (newDuration: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [duration, setDuration] = useState<number>(initialDuration || 60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(isoToLocalDatetimeInput(initialStart) || null);
  const [endTime, setEndTime] = useState<string | null>(isoToLocalDatetimeInput(initialEnd) || null);

  const save = async () => {
    setError(null);
    setLoading(true);
    try {
      const payload: any = { testId };
      if (typeof duration === 'number') payload.duration_minutes = Number(duration);
      if (startTime) payload.start_time = startTime;
      if (endTime) payload.end_time = endTime;

      const resp = await fetch('/api/admin/tests/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Update failed');
  setEditing(false);
  // Reload to refresh server-side data on admin dashboard
  try { window.location.reload(); } catch (_) {}
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!editing ? (
        <>
          <div className="text-sm text-muted-foreground">{duration} min</div>
          <Button size="icon" onClick={() => setEditing(true)} title="Edit test duration and dates">✏️</Button>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input title="duration-minutes" type="number" min={1} value={duration} onChange={e => setDuration(Number(e.target.value) || 1)} className="w-20 max-w-full border rounded px-2 py-1 text-sm" />
          <input title="start-time" type="datetime-local" value={startTime || ''} onChange={e => setStartTime(e.target.value || null)} className="min-w-[180px] max-w-[260px] border rounded px-2 py-1 text-sm" />
          <input title="end-time" type="datetime-local" value={endTime || ''} onChange={e => setEndTime(e.target.value || null)} className="min-w-[180px] max-w-[260px] border rounded px-2 py-1 text-sm" />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
          {error && <div className="w-full text-xs text-red-600 mt-1">{error}</div>}
        </div>
      )}
    </div>
  );
}
