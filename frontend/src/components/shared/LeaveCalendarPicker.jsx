import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, RotateCcw } from 'lucide-react';

const LeaveCalendarPicker = ({ startDate, endDate, onChange }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [mode, setMode] = useState('single'); // 'single' | 'range'
    const [rangeStep, setRangeStep] = useState(0); // 0 = pick start, 1 = pick end

    // Parse 'YYYY-MM-DD'
    const parseDateStr = (dateStr) => {
        if (!dateStr) return null;
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    // Format Date object to 'YYYY-MM-DD'
    const formatDateStr = (dateObj) => {
        if (!dateObj) return '';
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const startObj = parseDateStr(startDate);
    const endObj = parseDateStr(endDate);

    useEffect(() => {
        // Auto-detect mode from initial data
        if (startDate && endDate && startDate !== endDate) {
            setMode('range');
        }
    }, [startDate, endDate]);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    // Calendar Grid Calculation
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarCells = [];
    for (let i = 0; i < firstDayOfMonth; i++) calendarCells.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarCells.push(new Date(year, month, d));

    const isSameDay = (d1, d2) => {
        if (!d1 || !d2) return false;
        return (
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate()
        );
    };

    const isInRange = (dayObj) => {
        if (!startObj || !endObj || !dayObj) return false;
        const t = dayObj.getTime();
        const s = startObj.getTime();
        const e = endObj.getTime();
        return t > s && t < e;
    };

    const handleDayClick = (dayObj) => {
        if (!dayObj) return;

        const dateStr = formatDateStr(dayObj);

        if (mode === 'single') {
            // Single Day Mode: Click sets both start & end to that single date
            onChange({ startDate: dateStr, endDate: dateStr });
        } else {
            // Range Mode
            if (rangeStep === 0 || !startObj) {
                // First click: Set Start Date
                onChange({ startDate: dateStr, endDate: dateStr });
                setRangeStep(1);
            } else {
                // Second click: Set End Date
                if (dayObj.getTime() < startObj.getTime()) {
                    // Clicked date is earlier -> swap
                    onChange({ startDate: dateStr, endDate: formatDateStr(startObj) });
                } else {
                    onChange({ startDate: formatDateStr(startObj), endDate: dateStr });
                }
                setRangeStep(0);
            }
        }
    };

    const handleModeSwitch = (newMode) => {
        setMode(newMode);
        setRangeStep(0);
        if (newMode === 'single' && startDate) {
            onChange({ startDate, endDate: startDate });
        }
    };

    const handleToday = () => {
        const today = new Date();
        const str = formatDateStr(today);
        setCurrentDate(today);
        onChange({ startDate: str, endDate: str });
    };

    const handleTomorrow = () => {
        const tmrw = new Date();
        tmrw.setDate(tmrw.getDate() + 1);
        const str = formatDateStr(tmrw);
        setCurrentDate(tmrw);
        onChange({ startDate: str, endDate: str });
    };

    const handleReset = () => {
        onChange({ startDate: '', endDate: '' });
        setRangeStep(0);
    };

    const getDurationText = () => {
        if (!startObj) return 'Select date(s) on the calendar';
        if (!endObj || isSameDay(startObj, endObj)) {
            return `1 Day Leave (${startObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })})`;
        }
        const diffTime = Math.abs(endObj - startObj);
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return `${days} Days Range (${startObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} — ${endObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    };

    return (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <button
                    type="button"
                    onClick={() => handleModeSwitch('single')}
                    style={{
                        flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none',
                        background: mode === 'single' ? 'var(--brand-primary)' : 'transparent',
                        color: mode === 'single' ? 'white' : 'var(--text-secondary)',
                        fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    🗓️ Single Day Leave
                </button>
                <button
                    type="button"
                    onClick={() => handleModeSwitch('range')}
                    style={{
                        flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none',
                        background: mode === 'range' ? 'var(--brand-primary)' : 'transparent',
                        color: mode === 'range' ? 'white' : 'var(--text-secondary)',
                        fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    📅 Multi-Day Range
                </button>
            </div>

            {/* Quick Action Chips & Manual Inputs Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                        type="button" onClick={handleToday}
                        style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', fontSize: '0.75rem', fontWeight: '600', color: 'var(--brand-primary)', cursor: 'pointer' }}
                    >
                        Today
                    </button>
                    <button
                        type="button" onClick={handleTomorrow}
                        style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', fontSize: '0.75rem', fontWeight: '600', color: 'var(--brand-primary)', cursor: 'pointer' }}
                    >
                        Tomorrow
                    </button>
                    <button
                        type="button" onClick={handleReset}
                        style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                        <RotateCcw size={12} /> Reset
                    </button>
                </div>
                {mode === 'range' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: '600' }}>
                        {rangeStep === 0 ? '👇 Step 1: Click Start Date' : '👇 Step 2: Click End Date'}
                    </span>
                )}
            </div>

            {/* Editable Start & End Date Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: mode === 'single' ? '1fr' : '1fr 1fr', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        {mode === 'single' ? 'Leave Date' : 'Start Date'}
                    </label>
                    <input
                        type="date" value={startDate}
                        onChange={e => {
                            const val = e.target.value;
                            if (mode === 'single') onChange({ startDate: val, endDate: val });
                            else onChange({ startDate: val, endDate: endDate || val });
                        }}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
                    />
                </div>
                {mode === 'range' && (
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>End Date</label>
                        <input
                            type="date" value={endDate}
                            onChange={e => onChange({ startDate: startDate || e.target.value, endDate: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
                        />
                    </div>
                )}
            </div>

            {/* Calendar Widget */}
            <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <button
                        type="button" onClick={prevMonth}
                        style={{ padding: '0.4rem', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {monthNames[month]} {year}
                    </span>
                    <button
                        type="button" onClick={nextMonth}
                        style={{ padding: '0.4rem', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Days of Week Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '0.5rem' }}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                        <div key={i} style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', padding: '4px 0' }}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* Month Days Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {calendarCells.map((dayObj, i) => {
                        if (!dayObj) return <div key={i} />;

                        const isStart = isSameDay(dayObj, startObj);
                        const isEnd = isSameDay(dayObj, endObj);
                        const inBetween = mode === 'range' && isInRange(dayObj);
                        const isSelected = isStart || (mode === 'range' && isEnd);

                        const today = new Date();
                        const isToday = isSameDay(dayObj, today);

                        let cellBg = 'transparent';
                        let cellColor = 'var(--text-primary)';
                        let borderRadius = '8px';

                        if (isSelected) {
                            cellBg = 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))';
                            cellColor = 'white';
                        } else if (inBetween) {
                            cellBg = 'rgba(99, 102, 241, 0.18)';
                            cellColor = 'var(--brand-primary)';
                            borderRadius = '0px';
                        }

                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => handleDayClick(dayObj)}
                                style={{
                                    height: '36px',
                                    border: isToday && !isSelected ? '1.5px solid var(--brand-primary)' : 'none',
                                    borderRadius,
                                    background: cellBg,
                                    color: cellColor,
                                    fontWeight: isSelected || isToday ? '700' : '500',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {dayObj.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selection Summary Pill */}
            <div style={{
                padding: '0.75rem 1rem', borderRadius: '10px',
                background: startObj ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-primary)',
                border: '1px solid ' + (startObj ? 'rgba(99, 102, 241, 0.3)' : 'var(--border-color)'),
                display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem',
                color: startObj ? 'var(--brand-primary)' : 'var(--text-secondary)'
            }}>
                <CalendarIcon size={16} />
                <span style={{ fontWeight: '600', flex: 1 }}>
                    {getDurationText()}
                </span>
                {startObj && <Check size={16} style={{ color: '#10b981' }} />}
            </div>
        </div>
    );
};

export default LeaveCalendarPicker;
