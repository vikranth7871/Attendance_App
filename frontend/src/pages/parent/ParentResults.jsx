import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Award, Printer, Calendar, Clock, MapPin, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── helpers ── */
const gradeColor = (g = '') => {
    if (['A+', 'A'].includes(g)) return { bg: 'rgba(16,185,129,0.15)', fg: '#10b981' };
    if (['B+', 'B'].includes(g)) return { bg: 'rgba(59,130,246,0.15)', fg: '#3b82f6' };
    if (['C+', 'C'].includes(g)) return { bg: 'rgba(245,158,11,0.15)', fg: '#f59e0b' };
    return { bg: 'rgba(239,68,68,0.15)', fg: '#ef4444' };
};

const pct = (obtained, max) => max > 0 ? Math.round((obtained / max) * 100) : 0;
const termLabel = (r) => (r.term && r.term.trim()) ? r.term.trim() : (r.exam_name || 'Other');

const isExpired = (dateStr, timeSlot) => {
    if (!dateStr) return false;
    const examDay = new Date(dateStr); examDay.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (examDay < today) return true;
    if (examDay.getTime() === today.getTime() && timeSlot) {
        const parts = timeSlot.split('-');
        if (parts.length > 1) {
            const m = parts[1].trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (m) {
                let h = parseInt(m[1]); const min = parseInt(m[2]);
                if (m[3].toUpperCase() === 'PM' && h < 12) h += 12;
                if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
                return new Date() > new Date(new Date().setHours(h, min, 0));
            }
        }
    }
    return false;
};

/* ── Report Card Print ── */
const printReportCard = (student, grouped, allTerms) => {
    const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const termSections = allTerms.map(term => {
        const items = grouped[term] || [];
        const termRows = items.map(r => {
            const p = pct(r.marks_obtained, r.max_marks || 100);
            const gc = gradeColor(r.grade);
            return `<tr>
                <td>${r.subject_name}</td>
                <td>${r.subject_code || '—'}</td>
                <td>${r.marks_obtained ?? '—'} / ${r.max_marks || 100}</td>
                <td>${p}%</td>
                <td><span style="background:${gc.bg};color:${gc.fg};padding:2px 10px;border-radius:6px;font-weight:800;">${r.grade || '—'}</span></td>
                <td style="color:#64748b;font-style:italic;">${r.remarks || ''}</td>
            </tr>`;
        }).join('');
        const avg = items.length ? Math.round(items.reduce((s, r) => s + pct(r.marks_obtained, r.max_marks || 100), 0) / items.length) : 0;
        return `<div class="term-section">
            <h3>${term}</h3>
            <table>
                <thead><tr><th>Subject</th><th>Code</th><th>Marks</th><th>%</th><th>Grade</th><th>Remarks</th></tr></thead>
                <tbody>${termRows}</tbody>
                <tfoot><tr><td colspan="3"><strong>Term Average</strong></td><td colspan="3"><strong>${avg}%</strong></td></tr></tfoot>
            </table>
        </div>`;
    }).join('');

    const all = Object.values(grouped).flat();
    const overallAvg = all.length ? Math.round(all.reduce((s, r) => s + pct(r.marks_obtained, r.max_marks || 100), 0) / all.length) : 0;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Report Card — ${student?.name || 'Student'}</title>
<style>
  body{font-family:'Segoe UI',sans-serif;color:#1e293b;padding:32px;font-size:13px;}
  .header{text-align:center;border-bottom:3px double #6366f1;padding-bottom:16px;margin-bottom:24px;}
  .header h1{font-size:22px;color:#6366f1;margin:0 0 4px;letter-spacing:1px;}
  .header p{margin:2px 0;font-size:13px;color:#475569;}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 32px;background:#f8fafc;padding:12px 16px;border-radius:8px;margin-bottom:24px;}
  .meta span{font-size:12px;color:#64748b;} .meta strong{color:#1e293b;}
  .term-section{margin-bottom:28px;}
  .term-section h3{font-size:14px;font-weight:800;color:#6366f1;margin-bottom:8px;padding:6px 12px;background:#eef2ff;border-left:4px solid #6366f1;border-radius:0 6px 6px 0;}
  table{width:100%;border-collapse:collapse;margin-bottom:4px;}
  th{background:#1e293b;color:#fff;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;}
  td{padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;}
  tr:nth-child(even) td{background:#f8fafc;}
  tfoot td{background:#f1f5f9;font-weight:600;border-top:2px solid #cbd5e1;}
  .overall{margin-top:24px;padding:16px;background:linear-gradient(135deg,#eef2ff,#ede9fe);border-radius:10px;border:1px solid #c7d2fe;text-align:center;}
  .overall h2{margin:0 0 4px;font-size:28px;color:#6366f1;} .overall p{margin:0;color:#64748b;font-size:12px;}
  .footer{margin-top:32px;border-top:1px solid #e2e8f0;padding-top:12px;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;}
  @media print{body{padding:16px;}}
</style></head><body>
<div class="header"><h1>OFFICIAL ACADEMIC REPORT CARD</h1><p>iAttend — Smart Student Attendance &amp; Performance System</p></div>
<div class="meta">
  <div><span>Student Name: </span><strong>${student?.name || '—'}</strong></div>
  <div><span>Class: </span><strong>${student?.class_name || student?.classInfo?.className || '—'}</strong></div>
  <div><span>Roll Number: </span><strong>${student?.roll_number || '—'}</strong></div>
  <div><span>Generated: </span><strong>${now}</strong></div>
</div>
${termSections}
<div class="overall">
  <p>Overall Academic Performance</p>
  <h2>${overallAvg}%</h2>
  <p>${overallAvg >= 75 ? '✅ PROMOTED / PASSED' : '⚠️ NEEDS IMPROVEMENT'}</p>
</div>
<div class="footer"><span>Generated by iAttend on ${now}</span><span>Computer-generated report.</span></div>
</body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
};

/* ─────────────────────── Main Component ─────────────────────── */
const ParentResults = ({ selectedChildId }) => {
    const [academicData, setAcademicData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(null);
    const [scheduleTab, setScheduleTab] = useState('upcoming');

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            try {
                const url = selectedChildId
                    ? `/parent/student-results?studentId=${selectedChildId}`
                    : '/parent/student-results';
                const { data } = await axios.get(url);

                // Normalise: backend may return { examResults, upcomingExams, student }
                // or student portal shape { results, schedules, student }
                if (data.examResults !== undefined) {
                    setAcademicData({
                        results: data.examResults || [],
                        schedules: data.upcomingExams || [],
                        student: data.student || {},
                    });
                } else {
                    setAcademicData(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [selectedChildId]);

    const { grouped, allTerms } = useMemo(() => {
        const results = academicData?.results || [];
        const map = {};
        results.forEach(r => {
            const key = termLabel(r);
            if (!map[key]) map[key] = [];
            map[key].push(r);
        });
        const order = ['CIA-1', 'CIA 1', 'CIA1', 'CIA-2', 'CIA 2', 'CIA2', 'Mid-Term', 'Midterm', 'Mid Term', 'End-Term', 'Final', 'Semester'];
        const keys = Object.keys(map).sort((a, b) => {
            const ai = order.findIndex(o => a.toLowerCase().includes(o.toLowerCase()));
            const bi = order.findIndex(o => b.toLowerCase().includes(o.toLowerCase()));
            if (ai >= 0 && bi >= 0) return ai - bi;
            if (ai >= 0) return -1; if (bi >= 0) return 1;
            return a.localeCompare(b);
        });
        return { grouped: map, allTerms: keys };
    }, [academicData]);

    const { scheduleGrouped, scheduleTerms, upcoming } = useMemo(() => {
        const schedules = academicData?.schedules || [];
        const active = schedules.filter(s => !isExpired(s.exam_date, s.time_slot));
        const map = {};
        schedules.forEach(s => {
            const key = termLabel(s);
            if (!map[key]) map[key] = [];
            map[key].push(s);
        });
        return { scheduleGrouped: map, scheduleTerms: Object.keys(map), upcoming: active };
    }, [academicData]);

    useEffect(() => {
        if (allTerms.length > 0 && !activeTab) setActiveTab(allTerms[0]);
    }, [allTerms]);

    if (loading) return (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid var(--border-color)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading results...
        </div>
    );

    const results = academicData?.results || [];
    const student = academicData?.student;
    const activeResults = grouped[activeTab] || [];
    const termAvg = activeResults.length
        ? Math.round(activeResults.reduce((s, r) => s + pct(r.marks_obtained, r.max_marks || 100), 0) / activeResults.length) : 0;
    const overallAvg = results.length
        ? Math.round(results.reduce((s, r) => s + pct(r.marks_obtained, r.max_marks || 100), 0) / results.length) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <Award size={28} style={{ color: 'var(--brand-primary)' }} /> Exam Results &amp; Performance
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        CIA-wise &amp; term-wise breakdown of {student?.name || 'your child'}'s academic performance.
                    </p>
                </div>
                <button
                    onClick={() => printReportCard(student, grouped, allTerms)}
                    disabled={results.length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '0.85rem', fontWeight: '700', background: 'var(--brand-primary)', color: '#fff', border: 'none', cursor: results.length ? 'pointer' : 'not-allowed', opacity: results.length ? 1 : 0.5, fontSize: '0.9rem' }}>
                    <Printer size={18} /> Download Report Card
                </button>
            </div>

            {/* Summary cards */}
            {results.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                    {[
                        { label: 'Overall Average', value: `${overallAvg}%`, color: '#6366f1' },
                        { label: 'Exams Taken', value: results.length, color: '#10b981' },
                        { label: 'Terms Covered', value: allTerms.length, color: '#f59e0b' },
                        { label: 'Status', value: overallAvg >= 75 ? 'PASS' : 'REVIEW', color: overallAvg >= 75 ? '#10b981' : '#ef4444' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '800', color }}>{value}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Results Section */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>📊 Published Exam Results</h3>

                {results.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <Award size={44} style={{ opacity: 0.15, margin: '0 auto 0.75rem' }} />
                        <p>No published exam results yet.</p>
                    </div>
                ) : (
                    <>
                        {/* Term tabs */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                            {allTerms.map(term => {
                                const isActive = term === activeTab;
                                return (
                                    <button key={term} onClick={() => setActiveTab(term)}
                                        style={{ padding: '0.4rem 1rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', transition: 'all 0.2s', background: isActive ? 'var(--brand-primary)' : 'var(--bg-secondary)', color: isActive ? '#fff' : 'var(--text-secondary)', boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.35)' : 'none' }}>
                                        {term}
                                        <span style={{ marginLeft: '0.4rem', background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--border-color)', padding: '0.05rem 0.4rem', borderRadius: '999px', fontSize: '0.7rem' }}>
                                            {(grouped[term] || []).length}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                                {/* Term avg */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <TrendingUp size={16} style={{ color: 'var(--brand-primary)' }} />
                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Term Average:</span>
                                    <span style={{ fontWeight: '800', fontSize: '0.95rem', color: termAvg >= 75 ? '#10b981' : termAvg >= 50 ? '#f59e0b' : '#ef4444' }}>{termAvg}%</span>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>across {activeResults.length} subject{activeResults.length !== 1 ? 's' : ''}</span>
                                </div>

                                {/* Table */}
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                                {['Subject', 'Code', 'Marks', '%', 'Grade', 'Exam Date', 'Remarks'].map(h => (
                                                    <th key={h} style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeResults.map((r, i) => {
                                                const gc = gradeColor(r.grade);
                                                const p = pct(r.marks_obtained, r.max_marks || 100);
                                                return (
                                                    <tr key={r.id || i} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                        <td style={{ padding: '0.75rem 0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{r.subject_name}</td>
                                                        <td style={{ padding: '0.75rem 0.85rem', color: 'var(--brand-primary)', fontWeight: '700', fontSize: '0.78rem' }}>{r.subject_code || '—'}</td>
                                                        <td style={{ padding: '0.75rem 0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                            {r.marks_obtained} <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>/ {r.max_marks || 100}</span>
                                                        </td>
                                                        <td style={{ padding: '0.75rem 0.85rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <div style={{ width: '48px', height: '5px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                                                                    <div style={{ width: `${p}%`, height: '100%', background: gc.fg, borderRadius: '4px' }} />
                                                                </div>
                                                                <span style={{ fontWeight: '700', color: gc.fg, fontSize: '0.82rem' }}>{p}%</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '0.75rem 0.85rem' }}>
                                                            <span style={{ padding: '0.2rem 0.65rem', borderRadius: '6px', background: gc.bg, color: gc.fg, fontWeight: '800', fontSize: '0.85rem' }}>{r.grade || '—'}</span>
                                                        </td>
                                                        <td style={{ padding: '0.75rem 0.85rem', color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                            {r.exam_date ? new Date(r.exam_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                        </td>
                                                        <td style={{ padding: '0.75rem 0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.8rem' }}>{r.remarks || '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: 'linear-gradient(90deg,rgba(99,102,241,0.06),transparent)' }}>
                                                <td colSpan={3} style={{ padding: '0.65rem 0.85rem', fontWeight: '700', color: 'var(--text-primary)', borderTop: '2px solid var(--border-color)' }}>Term Average</td>
                                                <td colSpan={4} style={{ padding: '0.65rem 0.85rem', fontWeight: '800', color: termAvg >= 75 ? '#10b981' : '#f59e0b', borderTop: '2px solid var(--border-color)', fontSize: '1rem' }}>{termAvg}%</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </>
                )}
            </div>

            {/* Schedule Section */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>📅 Examination Schedule</h3>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <button onClick={() => setScheduleTab('upcoming')}
                        style={{ padding: '0.4rem 1rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', transition: 'all 0.2s', background: scheduleTab === 'upcoming' ? '#10b981' : 'var(--bg-secondary)', color: scheduleTab === 'upcoming' ? '#fff' : 'var(--text-secondary)', boxShadow: scheduleTab === 'upcoming' ? '0 2px 8px rgba(16,185,129,0.35)' : 'none' }}>
                        Upcoming <span style={{ marginLeft: '0.3rem', background: scheduleTab === 'upcoming' ? 'rgba(255,255,255,0.25)' : 'var(--border-color)', padding: '0.05rem 0.4rem', borderRadius: '999px', fontSize: '0.7rem' }}>{upcoming.length}</span>
                    </button>
                    {scheduleTerms.map(term => (
                        <button key={term} onClick={() => setScheduleTab(term)}
                            style={{ padding: '0.4rem 1rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', transition: 'all 0.2s', background: scheduleTab === term ? 'var(--brand-primary)' : 'var(--bg-secondary)', color: scheduleTab === term ? '#fff' : 'var(--text-secondary)', boxShadow: scheduleTab === term ? '0 2px 8px rgba(99,102,241,0.35)' : 'none' }}>
                            {term}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div key={scheduleTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(() => {
                            const list = scheduleTab === 'upcoming' ? upcoming : (scheduleGrouped[scheduleTab] || []);
                            if (list.length === 0) return (
                                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                                    <Calendar size={36} style={{ opacity: 0.15, margin: '0 auto 0.5rem' }} />
                                    <p>No exam schedule found.</p>
                                </div>
                            );
                            return list.map((sc, i) => {
                                const expired = isExpired(sc.exam_date, sc.time_slot);
                                const examDate = new Date(sc.exam_date);
                                const today = new Date(); today.setHours(0, 0, 0, 0);
                                const diffDays = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
                                const isUrgent = !expired && diffDays <= 3;
                                return (
                                    <div key={sc.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem 1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: `1px solid ${isUrgent ? 'rgba(245,158,11,0.35)' : 'var(--border-color)'}`, borderLeft: `3px solid ${isUrgent ? '#f59e0b' : expired ? '#94a3b8' : 'var(--brand-primary)'}`, opacity: expired ? 0.6 : 1 }}>
                                        <div>
                                            <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{sc.exam_name} — {sc.subject_name}</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Calendar size={12} /> {examDate.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                                {sc.time_slot && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={12} /> {sc.time_slot}</span>}
                                                {sc.room_number && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={12} /> Room {sc.room_number}</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '800', background: isUrgent ? 'rgba(245,158,11,0.12)' : expired ? 'rgba(148,163,184,0.12)' : 'rgba(99,102,241,0.1)', color: isUrgent ? '#f59e0b' : expired ? '#94a3b8' : '#818cf8' }}>
                                                {expired ? 'Completed' : diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `${diffDays} days left`}
                                            </span>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Max: {sc.max_marks || 100} marks</span>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ParentResults;
