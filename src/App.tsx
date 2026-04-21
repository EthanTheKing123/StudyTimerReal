import { useState, useEffect, useRef } from "react";

const DEFAULT_TAGS = [
  { id: 1, label: "Deep Work", color: "#6366f1" },
  { id: 2, label: "Study", color: "#0ea5e9" },
  { id: 3, label: "Reading", color: "#10b981" },
  { id: 4, label: "Exercise", color: "#f59e0b" },
  { id: 5, label: "Creative", color: "#ec4899" },
];

const PALETTE = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#84cc16",
];

const fmt = (s) => {
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = s % 60;
  return h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
        sec
      ).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};
const fmtShort = (s) => {
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : `${s}s`;
};
const todayStr = () => new Date().toDateString();
const inPeriod = (ts, period) => {
  const d = new Date(ts),
    now = new Date();
  if (period === "day") return d.toDateString() === now.toDateString();
  if (period === "week") {
    const s = new Date(now);
    s.setDate(now.getDate() - now.getDay());
    s.setHours(0, 0, 0, 0);
    return d >= s;
  }
  if (period === "month")
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  if (period === "year") return d.getFullYear() === now.getFullYear();
  return true;
};
const load = (k, def) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : def;
  } catch {
    return def;
  }
};

function HourlyChart({ sessions, tags }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const data = hours.map((h) => {
    const hs = sessions.filter((s) => new Date(s.ts).getHours() === h);
    const secs = hs.reduce((a, s) => a + s.duration, 0);
    // build tag segments
    const tagMap = {};
    hs.forEach((s) => {
      const k = s.tagId || "none";
      tagMap[k] = (tagMap[k] || 0) + s.duration;
    });
    const segments = Object.entries(tagMap)
      .sort((a, b) => b[1] - a[1])
      .map(([id, s]) => ({
        color:
          id === "none"
            ? "#d4d4d0"
            : tags.find((t) => t.id === Number(id))?.color || "#d4d4d0",
        secs: s,
      }));
    return { h, secs, segments };
  });
  const maxSecs = Math.max(...data.map((d) => d.secs), 60);
  const labels = [0, 4, 8, 12, 16, 20];
  const labelMap = {
    0: "12AM",
    4: "4AM",
    8: "8AM",
    12: "12PM",
    16: "4PM",
    20: "8PM",
  };
  const yMax = Math.ceil(maxSecs / 60);
  const yTicks = [0, Math.round(yMax * 0.5), yMax];

  return (
    <div style={{ width: "100%", userSelect: "none" }}>
      <div
        style={{
          display: "flex",
          gap: 0,
          height: 90,
          alignItems: "flex-end",
          paddingLeft: 28,
          paddingRight: 4,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 16,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 24,
          }}
        >
          {[...yTicks].reverse().map((t) => (
            <span
              key={t}
              style={{
                fontSize: 9,
                color: "#bbb",
                textAlign: "right",
                width: "100%",
                lineHeight: 1,
              }}
            >
              {t}m
            </span>
          ))}
        </div>
        {data.map(({ h, secs, segments }) => (
          <div
            key={h}
            title={`${h}:00 — ${fmtShort(secs)}`}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              height: "100%",
            }}
          >
            {secs > 0 ? (
              <div
                style={{
                  width: "72%",
                  height: `${Math.max((secs / maxSecs) * 100, 4)}%`,
                  borderRadius: "3px 3px 0 0",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column-reverse",
                }}
              >
                {segments.map((seg, i) => (
                  <div
                    key={i}
                    style={{
                      width: "100%",
                      flex: seg.secs,
                      background: seg.color,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  width: "72%",
                  height: 2,
                  background: "#f0f0ef",
                  borderRadius: 1,
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          paddingLeft: 28,
          paddingRight: 4,
          marginTop: 4,
          height: 14,
        }}
      >
        {hours.map((h) => (
          <div
            key={h}
            style={{ flex: 1, display: "flex", justifyContent: "center" }}
          >
            {labels.includes(h) && (
              <span
                style={{ fontSize: 9, color: "#bbb", whiteSpace: "nowrap" }}
              >
                {labelMap[h]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DistBar({ sessions, tags }) {
  const total = sessions.reduce((a, s) => a + s.duration, 0);
  if (!total) return null;
  const grouped = tags
    .map((t) => ({
      ...t,
      secs: sessions
        .filter((s) => s.tagId === t.id)
        .reduce((a, s) => a + s.duration, 0),
    }))
    .filter((t) => t.secs > 0);
  const untagged = sessions
    .filter((s) => !s.tagId)
    .reduce((a, s) => a + s.duration, 0);
  if (untagged > 0)
    grouped.push({
      id: "none",
      label: "Untagged",
      color: "#d4d4d0",
      secs: untagged,
    });
  return (
    <div>
      <div
        style={{
          display: "flex",
          height: 8,
          borderRadius: 6,
          overflow: "hidden",
          gap: 1.5,
        }}
      >
        {grouped.map((t) => (
          <div
            key={t.id}
            title={`${t.label}: ${Math.round((t.secs / total) * 100)}%`}
            style={{
              flex: t.secs / total,
              background: t.color,
              transition: "flex 0.4s",
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "5px 12px",
          marginTop: 7,
        }}
      >
        {grouped.map((t) => (
          <span
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "#888",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: t.color,
              }}
            />
            {t.label}{" "}
            <span style={{ color: "#bbb" }}>
              {Math.round((t.secs / total) * 100)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [tags, setTags] = useState(() => load("tt_tags", DEFAULT_TAGS));
  const [sessions, setSessions] = useState(() => load("tt_sessions", []));
  const [mode, setMode] = useState("stopwatch");
  const [selTag, setSelTag] = useState(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerMin, setTimerMin] = useState(25);
  const [timerSecs, setTimerSecs] = useState(25 * 60);
  const [view, setView] = useState("home");
  const [period, setPeriod] = useState("day");
  const [showOptions, setShowOptions] = useState(false);
  const [showTagDrop, setShowTagDrop] = useState(false);
  const [editTag, setEditTag] = useState(null);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagColor, setNewTagColor] = useState(PALETTE[0]);
  const [editSession, setEditSession] = useState(null);
  const intervalRef = useRef(null);
  const optRef = useRef(null);
  const tagRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("tt_tags", JSON.stringify(tags));
  }, [tags]);
  useEffect(() => {
    localStorage.setItem("tt_sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    const handler = (e) => {
      if (optRef.current && !optRef.current.contains(e.target))
        setShowOptions(false);
      if (tagRef.current && !tagRef.current.contains(e.target))
        setShowTagDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        if (mode === "stopwatch") {
          setElapsed((e) => e + 1);
        } else {
          setTimerSecs((t) => {
            if (t <= 1) {
              stopSession(true);
              return 0;
            }
            return t - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const [paused, setPaused] = useState(false);
  const pausedElapsedRef = useRef(0);

  const startSession = () => {
    if (mode === "timer") setTimerSecs(timerMin * 60);
    setElapsed(0);
    pausedElapsedRef.current = 0;
    setPaused(false);
    setRunning(true);
    setShowOptions(false);
    setShowTagDrop(false);
  };
  const pauseSession = () => {
    if (paused) {
      setPaused(false);
      setRunning(true);
    } else {
      setPaused(true);
      setRunning(false);
      pausedElapsedRef.current = elapsed;
    }
  };
  const stopSession = (completed = false) => {
    setRunning(false);
    setPaused(false);
    clearInterval(intervalRef.current);
    const dur =
      mode === "stopwatch"
        ? elapsed
        : completed
        ? timerMin * 60
        : timerMin * 60 - timerSecs;
    if (dur > 3)
      setSessions((prev) => [
        ...prev,
        {
          id: Date.now(),
          tagId: selTag,
          duration: dur,
          date: todayStr(),
          ts: Date.now(),
          mode,
        },
      ]);
    setElapsed(0);
    pausedElapsedRef.current = 0;
    if (mode === "timer") setTimerSecs(timerMin * 60);
  };

  const exportCSV = () => {
    const rows = [
      ["id", "tag", "duration_seconds", "date", "timestamp", "mode"],
      ...sessions.map((s) => {
        const t = tags.find((t) => t.id === s.tagId);
        return [
          s.id,
          t?.label || "Untagged",
          s.duration,
          s.date,
          new Date(s.ts).toISOString(),
          s.mode,
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "focus-sessions.csv";
    a.click();
  };

  const displayTime = mode === "stopwatch" ? elapsed : timerSecs;
  const activeTag = tags.find((t) => t.id === selTag);
  const filtered = sessions.filter((s) => inPeriod(s.ts, period));
  const totalSecs = filtered.reduce((a, s) => a + s.duration, 0);
  const tagTotals = tags
    .map((t) => ({
      ...t,
      secs: filtered
        .filter((s) => s.tagId === t.id)
        .reduce((a, s) => a + s.duration, 0),
    }))
    .filter((t) => t.secs > 0)
    .sort((a, b) => b.secs - a.secs);
  const todaySessions = sessions.filter((s) => inPeriod(s.ts, "day"));

  const addTag = () => {
    if (!newTagLabel.trim()) return;
    setTags((prev) => [
      ...prev,
      { id: Date.now(), label: newTagLabel.trim(), color: newTagColor },
    ]);
    setNewTagLabel("");
  };
  const updateTag = (id, changes) =>
    setTags((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...changes } : t))
    );
  const deleteTag = (id) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
    if (selTag === id) setSelTag(null);
  };

  const nb = (active) => ({
    padding: "5px 14px",
    borderRadius: 6,
    border: "none",
    background: active ? "#f0f0ef" : "transparent",
    color: active ? "#191919" : "#888",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  });

  return (
    <div
      style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        background: "#fff",
        minHeight: "100vh",
        color: "#191919",
      }}
    >
      {/* Nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 32px",
          borderBottom: "1px solid #f0f0ef",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#888",
            letterSpacing: "0.02em",
          }}
        >
          ⏱ focus
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          {["home", "stats", "tags"].map((v) => (
            <button key={v} style={nb(view === v)} onClick={() => setView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* HOME */}
      {view === "home" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - 62px)",
            padding: "0 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: "-6px",
              lineHeight: 1,
              color: running ? "#191919" : "#d4d4d0",
              fontVariantNumeric: "tabular-nums",
              userSelect: "none",
              transition: "color 0.3s",
            }}
          >
            {fmt(displayTime)}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 20,
              justifyContent: "center",
            }}
          >
            {/* Tag */}
            <div style={{ position: "relative" }} ref={tagRef}>
              <button
                onClick={() => !running && setShowTagDrop((v) => !v)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  border: `1.5px solid ${
                    activeTag ? activeTag.color : "#e8e8e7"
                  }`,
                  background: activeTag
                    ? activeTag.color + "18"
                    : "transparent",
                  color: activeTag ? activeTag.color : "#888",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {activeTag ? (
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: activeTag.color,
                        display: "inline-block",
                      }}
                    />
                    {activeTag.label}
                  </span>
                ) : (
                  "Select tag"
                )}
              </button>
              {showTagDrop && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#fff",
                    border: "1px solid #e8e8e7",
                    borderRadius: 10,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                    padding: 10,
                    zIndex: 100,
                    minWidth: 200,
                  }}
                >
                  {tags.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelTag(t.id);
                        setShowTagDrop(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
                        borderRadius: 7,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f7f7f6")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: t.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>
                        {t.label}
                      </span>
                      {selTag === t.id && (
                        <span style={{ fontSize: 12, color: t.color }}>✓</span>
                      )}
                    </div>
                  ))}
                  <div
                    style={{
                      borderTop: "1px solid #f0f0ef",
                      marginTop: 6,
                      paddingTop: 6,
                      display: "flex",
                      gap: 6,
                    }}
                  >
                    <input
                      value={newTagLabel}
                      onChange={(e) => setNewTagLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTag()}
                      placeholder="New tag…"
                      style={{
                        flex: 1,
                        padding: "5px 8px",
                        border: "1px solid #e8e8e7",
                        borderRadius: 6,
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={addTag}
                      style={{
                        background: "#191919",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "5px 10px",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* Options */}
            <div style={{ position: "relative" }} ref={optRef}>
              <button
                onClick={() => !running && setShowOptions((v) => !v)}
                style={{
                  background: "none",
                  border: "1px solid #e8e8e7",
                  borderRadius: 8,
                  padding: "6px 14px",
                  fontSize: 13,
                  color: "#888",
                  cursor: "pointer",
                }}
              >
                Options
              </button>
              {showOptions && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    background: "#fff",
                    border: "1px solid #e8e8e7",
                    borderRadius: 10,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                    padding: 10,
                    zIndex: 100,
                    minWidth: 190,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#bbb",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      padding: "4px 8px",
                      marginBottom: 4,
                    }}
                  >
                    Mode
                  </div>
                  {["stopwatch", "timer"].map((m) => (
                    <div
                      key={m}
                      onClick={() => {
                        setMode(m);
                        setElapsed(0);
                        setTimerSecs(timerMin * 60);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "7px 10px",
                        borderRadius: 7,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f7f7f6")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {m === "stopwatch" ? "⏱ Stopwatch" : "⏳ Timer"}
                      </span>
                      {mode === m && <span style={{ fontSize: 12 }}>✓</span>}
                    </div>
                  ))}
                  {mode === "timer" && (
                    <div
                      style={{
                        padding: "8px 8px 4px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 13, color: "#888" }}>
                        Minutes
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={timerMin}
                        onChange={(e) => {
                          const v = Math.max(1, parseInt(e.target.value) || 1);
                          setTimerMin(v);
                          setTimerSecs(v * 60);
                        }}
                        style={{
                          width: 60,
                          padding: "4px 8px",
                          border: "1px solid #e8e8e7",
                          borderRadius: 6,
                          fontSize: 13,
                          textAlign: "center",
                          outline: "none",
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#bbb",
              marginTop: 8,
              letterSpacing: "0.05em",
            }}
          >
            {mode === "stopwatch" ? "STOPWATCH" : `TIMER · ${timerMin} MIN`}
          </div>
          {!running && !paused ? (
            <button
              onClick={startSession}
              style={{
                background: "#191919",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "13px 48px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 28,
              }}
            >
              Start
            </button>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 28,
              }}
            >
              <button
                onClick={pauseSession}
                style={{
                  background: "none",
                  border: "1px solid #e8e8e7",
                  borderRadius: 10,
                  padding: "13px 22px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: paused ? "#191919" : "#888",
                }}
              >
                {paused ? "Resume" : "Pause"}
              </button>
              <button
                onClick={() => stopSession(false)}
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "13px 36px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Stop
              </button>
            </div>
          )}
        </div>
      )}

      {/* STATS */}
      {view === "stats" && (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px" }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 24,
              letterSpacing: "-0.5px",
            }}
          >
            Stats
          </h2>
          <div
            style={{
              display: "flex",
              gap: 2,
              background: "#f7f7f6",
              borderRadius: 8,
              padding: 3,
              width: "fit-content",
              marginBottom: 28,
            }}
          >
            {["day", "week", "month", "year"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: "5px 18px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  background: period === p ? "#fff" : "transparent",
                  color: period === p ? "#191919" : "#888",
                  boxShadow:
                    period === p ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 24 }}>
            <div
              style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-3px" }}
            >
              {fmtShort(totalSecs)}
            </div>
            <div style={{ fontSize: 13, color: "#aaa", marginTop: 2 }}>
              {filtered.length} session{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
          {period === "day" && filtered.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <HourlyChart sessions={filtered} tags={tags} />
            </div>
          )}
          {totalSecs > 0 && (
            <div style={{ marginBottom: 24 }}>
              <DistBar sessions={filtered} tags={tags} />
            </div>
          )}
          {tagTotals.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#bbb",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 14,
                }}
              >
                Breakdown
              </div>
              {tagTotals.map((t) => (
                <div key={t.id} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: t.color,
                        }}
                      />
                      {t.label}
                    </span>
                    <span
                      style={{ fontSize: 14, fontWeight: 600, color: "#555" }}
                    >
                      {fmtShort(t.secs)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      background: "#f0f0ef",
                      borderRadius: 4,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(t.secs / totalSecs) * 100}%`,
                        background: t.color,
                        borderRadius: 4,
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Session log */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#bbb",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 12,
              }}
            >
              Sessions
            </div>
            {filtered.length === 0 ? (
              <div
                style={{
                  color: "#ccc",
                  fontSize: 14,
                  padding: "20px 0",
                  textAlign: "center",
                }}
              >
                No sessions in this period
              </div>
            ) : (
              [...filtered]
                .sort((a, b) => b.ts - a.ts)
                .map((s) => {
                  const t = tags.find((t) => t.id === s.tagId);
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderBottom: "1px solid #f7f7f6",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: t?.color || "#ddd",
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span style={{ fontSize: 13, fontWeight: 500 }}>
                              {t?.label || "Untagged"}
                            </span>
                            {/* inline tag editor */}
                            {editSession === s.id ? (
                              <div
                                style={{
                                  display: "flex",
                                  gap: 4,
                                  flexWrap: "wrap",
                                  maxWidth: 200,
                                }}
                              >
                                {tags.map((tg) => (
                                  <span
                                    key={tg.id}
                                    onClick={() => {
                                      setSessions((p) =>
                                        p.map((x) =>
                                          x.id === s.id
                                            ? { ...x, tagId: tg.id }
                                            : x
                                        )
                                      );
                                      setEditSession(null);
                                    }}
                                    style={{
                                      padding: "2px 8px",
                                      borderRadius: 10,
                                      background: tg.color + "22",
                                      color: tg.color,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      border: `1px solid ${tg.color}44`,
                                    }}
                                  >
                                    {tg.label}
                                  </span>
                                ))}
                                <span
                                  onClick={() => setEditSession(null)}
                                  style={{
                                    padding: "2px 6px",
                                    borderRadius: 10,
                                    background: "#f0f0ef",
                                    color: "#888",
                                    fontSize: 11,
                                    cursor: "pointer",
                                  }}
                                >
                                  ✕
                                </span>
                              </div>
                            ) : (
                              <span
                                onClick={() => setEditSession(s.id)}
                                style={{
                                  fontSize: 11,
                                  color: "#ccc",
                                  cursor: "pointer",
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  border: "1px solid #f0f0ef",
                                }}
                              >
                                edit tag
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "#bbb" }}>
                            {new Date(s.ts).toLocaleDateString([], {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            ·{" "}
                            {new Date(s.ts).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#555",
                          }}
                        >
                          {fmtShort(s.duration)}
                        </span>
                        <button
                          onClick={() =>
                            setSessions((p) => p.filter((x) => x.id !== s.id))
                          }
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#ddd",
                            fontSize: 16,
                            padding: 2,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Hidden export */}
          {sessions.length > 0 && (
            <div style={{ marginTop: 48, textAlign: "center" }}>
              <button
                onClick={exportCSV}
                style={{
                  background: "none",
                  border: "none",
                  color: "#e0e0de",
                  fontSize: 11,
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                }}
              >
                export data
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAGS */}
      {view === "tags" && (
        <div style={{ maxWidth: 500, margin: "0 auto", padding: "40px 24px" }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 24,
              letterSpacing: "-0.5px",
            }}
          >
            Tags
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 24,
            }}
          >
            {tags.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  border: "1px solid #f0f0ef",
                  borderRadius: 10,
                }}
              >
                {editTag === t.id ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        flexWrap: "wrap",
                        flex: 1,
                      }}
                    >
                      {PALETTE.map((c) => (
                        <div
                          key={c}
                          onClick={() => updateTag(t.id, { color: c })}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: c,
                            cursor: "pointer",
                            outline:
                              t.color === c ? "2px solid #191919" : "none",
                            outlineOffset: 2,
                          }}
                        />
                      ))}
                    </div>
                    <input
                      defaultValue={t.label}
                      onBlur={(e) => updateTag(t.id, { label: e.target.value })}
                      autoFocus
                      style={{
                        border: "1px solid #e8e8e7",
                        borderRadius: 6,
                        padding: "4px 8px",
                        fontSize: 13,
                        outline: "none",
                        width: 120,
                      }}
                    />
                    <button
                      onClick={() => setEditTag(null)}
                      style={{
                        background: "#191919",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Done
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: t.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>
                      {t.label}
                    </span>
                    <button
                      onClick={() => setEditTag(t.id)}
                      style={{
                        background: "none",
                        border: "1px solid #e8e8e7",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 12,
                        color: "#888",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTag(t.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#ddd",
                        fontSize: 18,
                        padding: 2,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              border: "1px dashed #e0e0de",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#bbb",
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              New tag
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {PALETTE.map((c) => (
                <div
                  key={c}
                  onClick={() => setNewTagColor(c)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: c,
                    cursor: "pointer",
                    outline: newTagColor === c ? "2px solid #191919" : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="Tag name…"
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  border: "1px solid #e8e8e7",
                  borderRadius: 7,
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                onClick={addTag}
                style={{
                  background: "#191919",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "7px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
