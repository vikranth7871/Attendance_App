import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Universal File Exporter for iAttend Mobile (Web & Native iOS/Android)
 */

export const exportText = async (filename, content, mimeType = 'text/plain') => {
  try {
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    }

    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: `Share ${filename}`,
        UTI: 'public.plain-text',
      });
      return true;
    } else {
      Alert.alert('File Saved', `Saved to ${filename}`);
      return true;
    }
  } catch (err) {
    console.error('Export error:', err);
    Alert.alert('Export Failed', err.message || 'Could not export file.');
    return false;
  }
};

export const exportCsv = async (filename, csvString) => {
  return exportText(filename.endsWith('.csv') ? filename : `${filename}.csv`, csvString, 'text/csv');
};

export const generateReportCardText = ({ studentName, className, rollNumber, results = [], averageGpa = '—' }) => {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  let text = `==========================================================\n`;
  text += `                iAttend ACADEMIC TRANSCRIPT               \n`;
  text += `==========================================================\n`;
  text += `Student Name  : ${studentName || 'Student'}\n`;
  text += `Class/Section : ${className || 'Academics'}\n`;
  text += `Roll Number   : ${rollNumber || '—'}\n`;
  text += `Date of Issue : ${dateStr}\n`;
  text += `Overall GPA   : ${averageGpa}\n`;
  text += `----------------------------------------------------------\n`;
  text += `SUBJECT               CODE       MARKS    MAX   GRADE\n`;
  text += `----------------------------------------------------------\n`;

  results.forEach(r => {
    const sName = (r.subject_name || r.name || 'Subject').padEnd(20).slice(0, 20);
    const code = (r.subject_code || r.code || '—').padEnd(10).slice(0, 10);
    const marks = String(r.marks_obtained ?? r.marks ?? '—').padStart(5);
    const max = String(r.max_marks ?? '100').padStart(5);
    const grade = String(r.grade || '—').padStart(6);
    text += `${sName}  ${code} ${marks} / ${max} ${grade}\n`;
  });

  text += `----------------------------------------------------------\n`;
  text += `Status: OFFICIAL TRANSCRIPT ISSUED BY iAttend PORTAL\n`;
  text += `==========================================================\n`;
  return text;
};

export const generateReceiptText = ({ receiptNo, studentName, amount, date, method, balance = '0' }) => {
  let text = `==========================================================\n`;
  text += `             iAttend TUITION FEE PAYMENT RECEIPT          \n`;
  text += `==========================================================\n`;
  text += `Receipt No    : #${receiptNo || 'REC-' + Date.now().toString().slice(-6)}\n`;
  text += `Student Name  : ${studentName || 'Student'}\n`;
  text += `Payment Date  : ${date ? new Date(date).toLocaleDateString() : new Date().toLocaleDateString()}\n`;
  text += `Payment Method: ${method || 'Online Banking'}\n`;
  text += `----------------------------------------------------------\n`;
  text += `Amount Paid   : ₹${parseFloat(amount || 0).toLocaleString('en-IN')}\n`;
  text += `Remaining Due : ₹${parseFloat(balance || 0).toLocaleString('en-IN')}\n`;
  text += `Status        : SUCCESSFUL / VERIFIED\n`;
  text += `----------------------------------------------------------\n`;
  text += `Thank you for your payment!\n`;
  text += `==========================================================\n`;
  return text;
};

export const generateCertificateText = ({ certId, studentName, quizTitle, percentage, date }) => {
  let text = `**********************************************************\n`;
  text += `*              CERTIFICATE OF MERIT & ACHIEVEMENT        *\n`;
  text += `**********************************************************\n\n`;
  text += `This is proudly presented to:\n\n`;
  text += `                   ${(studentName || 'STUDENT').toUpperCase()}                   \n\n`;
  text += `For outstanding performance in:\n`;
  text += `"${quizTitle || 'Quiz Arena Examination'}"\n\n`;
  text += `Score Achieved : ${percentage}%\n`;
  text += `Certificate ID : ${certId || 'CERT-' + Date.now().toString().slice(-8)}\n`;
  text += `Date of Issue  : ${date ? new Date(date).toLocaleDateString() : new Date().toLocaleDateString()}\n\n`;
  text += `**********************************************************\n`;
  text += `*   Verified & Issued Digitally by iAttend Quiz Arena    *\n`;
  text += `**********************************************************\n`;
  return text;
};

