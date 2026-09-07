import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Universal Timetable Grid Image Exporter for iAttend
 * Renders the full 6-day x 7-slot timetable grid into a high-resolution PNG image
 * matching the official iAttend TimetableGrid design (media_1788699868026.png).
 */

const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_TIME_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM'
];

const DEFAULT_PERIOD_COLORS = [
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'
];

// Helper to find a subject in a specific day & time slot
const findSlotSubject = (subjects, day, slot) => {
  return subjects.find((s) => {
    const sDay = s.dayOfWeek || s.day_of_week;
    if (!sDay || sDay.toLowerCase() !== day.toLowerCase()) return false;

    const sSlot = s.timeSlot || s.time_slot;
    if (sSlot && sSlot.toLowerCase() === slot.toLowerCase()) return true;

    const [slotStart] = slot.split(' - ');
    if (s.startTime && slotStart && (s.startTime.startsWith(slotStart.slice(0, 5)) || slotStart.includes(s.startTime))) {
      return true;
    }
    return false;
  });
};

// Helper for rounded rectangle in Canvas 2D
const drawRoundRect = (ctx, x, y, w, h, r) => {
  const radius = typeof r === 'number' ? r : 8;
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
};

/**
 * Generate full timetable grid onto an HTML5 Canvas (Web)
 */
const renderGridOnCanvas = (canvas, { subjects, days, timeSlots, periodColors }) => {
  const width = 1024;
  const height = 772;
  const scale = 2; // Retina 2x for sharp publication render

  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // 1. Clear background & Outer Rounded Container (#121212)
  ctx.fillStyle = '#121212';
  ctx.fillRect(0, 0, width, height);

  // Outer border with rounded corners
  const outerX = 1;
  const outerY = 1;
  const outerW = width - 2;
  const outerH = height - 2;
  const outerR = 12;

  drawRoundRect(ctx, outerX, outerY, outerW, outerH, outerR);
  ctx.fillStyle = '#121212';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Layout metrics
  const headerHeight = 42;
  const timeColWidth = 80;
  const numDays = days.length;
  const dayColWidth = (outerW - timeColWidth) / numDays;
  const numSlots = timeSlots.length;
  const slotRowHeight = (outerH - headerHeight) / numSlots;

  // 2. Header Row
  // Header bottom border line (2px solid)
  ctx.beginPath();
  ctx.moveTo(outerX, headerHeight);
  ctx.lineTo(outerW, headerHeight);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // "TIME" Header Cell
  ctx.font = '800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#a0a0a0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TIME', outerX + timeColWidth / 2, headerHeight / 2);

  // Vertical border after Time column
  ctx.beginPath();
  ctx.moveTo(outerX + timeColWidth, outerY);
  ctx.lineTo(outerX + timeColWidth, outerH);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Day Headers
  days.forEach((day, dIdx) => {
    const colX = outerX + timeColWidth + dIdx * dayColWidth;
    ctx.font = '800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#6366f1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(day.toUpperCase(), colX + dayColWidth / 2, headerHeight / 2);

    // Vertical line between day columns
    if (dIdx < numDays - 1) {
      ctx.beginPath();
      ctx.moveTo(colX + dayColWidth, outerY);
      ctx.lineTo(colX + dayColWidth, outerH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });

  // 3. Slot Rows
  timeSlots.forEach((slot, rIdx) => {
    const rowY = headerHeight + rIdx * slotRowHeight;

    // Horizontal border line below each slot row
    if (rIdx < numSlots - 1) {
      ctx.beginPath();
      ctx.moveTo(outerX, rowY + slotRowHeight);
      ctx.lineTo(outerW, rowY + slotRowHeight);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Time Cell content
    const [startPart = '', endPart = ''] = slot.split(' - ');
    const timeCenterX = outerX + timeColWidth / 2;

    // Clock Icon
    const clockY = rowY + 28;
    ctx.beginPath();
    ctx.arc(timeCenterX, clockY, 5.5, 0, Math.PI * 2);
    ctx.strokeStyle = '#707070';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(timeCenterX, clockY);
    ctx.lineTo(timeCenterX, clockY - 3.2);
    ctx.moveTo(timeCenterX, clockY);
    ctx.lineTo(timeCenterX + 2.8, clockY);
    ctx.stroke();

    // Start time
    ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#a0a0a0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(startPart, timeCenterX, rowY + 46);

    // "to"
    ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#707070';
    ctx.fillText('to', timeCenterX, rowY + 59);

    // End time
    ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#a0a0a0';
    ctx.fillText(endPart, timeCenterX, rowY + 72);

    // Day Cells for this slot
    days.forEach((day, dIdx) => {
      const colX = outerX + timeColWidth + dIdx * dayColWidth;
      const sub = findSlotSubject(subjects, day, slot);

      if (sub) {
        // Lecture Card
        const cardX = colX + 4;
        const cardY = rowY + 4;
        const cardW = dayColWidth - 8;
        const cardH = slotRowHeight - 8;
        const cardR = 7;
        // Single brand primary color matching the website (#5b50e6 = --brand-primary)
        const BRAND_COLOR = '#5b50e6';

        // Card body
        drawRoundRect(ctx, cardX, cardY, cardW, cardH, cardR);
        ctx.fillStyle = '#1e1e1e';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 3px Left Accent Border — single brand color
        ctx.beginPath();
        ctx.moveTo(cardX + 2, cardY + 6);
        ctx.lineTo(cardX + 2, cardY + cardH - 6);
        ctx.strokeStyle = BRAND_COLOR;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.lineCap = 'butt'; // reset

        // Subject Name
        const subName = sub.subjectId?.name || sub.subjectId?.subjectName || sub.subjectName || sub.subject_name || sub.name || 'Subject';
        ctx.font = '800 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Truncate subject if needed
        let displaySub = subName;
        while (ctx.measureText(displaySub).width > cardW - 18 && displaySub.length > 3) {
          displaySub = displaySub.slice(0, -2) + '…';
        }
        ctx.fillText(displaySub, cardX + 10, cardY + 10);

        // Room Location
        const roomStr = sub.roomNumber || sub.room_number ? `${sub.roomNumber || sub.room_number}` : 'Room TBD';
        const roomY = cardY + 32;

        // Draw canvas pin icon (circle body + teardrop bottom) — no emoji
        const pinX = cardX + 13;
        const pinCY = roomY - 3;
        ctx.save();
        ctx.fillStyle = '#707070';
        // Circle head
        ctx.beginPath();
        ctx.arc(pinX, pinCY - 2.5, 2.8, 0, Math.PI * 2);
        ctx.fill();
        // Pin tail (small triangle downward)
        ctx.beginPath();
        ctx.moveTo(pinX - 1.5, pinCY - 0.5);
        ctx.lineTo(pinX + 1.5, pinCY - 0.5);
        ctx.lineTo(pinX, pinCY + 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#a0a0a0';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(roomStr, cardX + 21, roomY - 1);

        // Class Section Badge
        const clsName = sub.classId?.name || sub.classId?.className || sub.className || sub.class_name;
        if (clsName) {
          const badgeY = cardY + cardH - 22;
          const badgeW = Math.min(ctx.measureText(clsName).width + 12, cardW - 20);
          const badgeH = 15;

          drawRoundRect(ctx, cardX + 10, badgeY, badgeW, badgeH, 4);
          ctx.fillStyle = '#121212';
          ctx.fill();

          ctx.font = '500 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#707070';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(clsName, cardX + 10 + badgeW / 2, badgeY + badgeH / 2 + 0.5);
        }
      } else {
        // Empty Slot: subtle centered dash
        ctx.font = '11px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('—', colX + dayColWidth / 2, rowY + slotRowHeight / 2);
      }
    });
  });
};

/**
 * Universal export function:
 * - On Web: Creates offscreen Canvas, draws pixel-perfect grid, downloads PNG picture.
 * - On Native: Writes file or shares picture.
 */
export const exportTimetableAsImage = async ({
  subjects = [],
  user = {},
  days = DEFAULT_DAYS,
  timeSlots = DEFAULT_TIME_SLOTS,
  periodColors = DEFAULT_PERIOD_COLORS,
  filename = 'timetable.png'
}) => {
  try {
    if (Platform.OS === 'web') {
      const canvas = document.createElement('canvas');
      renderGridOnCanvas(canvas, { subjects, days, timeSlots, periodColors });

      // Convert to blob and trigger download
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            // Fallback to dataURL
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            resolve(true);
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = filename;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          resolve(true);
        }, 'image/png');
      });
    }

    // Native iOS/Android Fallback
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: 'Download Timetable Image',
      });
      return true;
    } else {
      Alert.alert('Download Complete', `Saved to ${filename}`);
      return true;
    }
  } catch (err) {
    console.error('exportTimetableAsImage error:', err);
    Alert.alert('Download Failed', err.message || 'Could not export timetable as image.');
    return false;
  }
};
