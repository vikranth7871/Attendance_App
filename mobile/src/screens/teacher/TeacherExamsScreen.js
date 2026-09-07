import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CalendarDays,
  Plus,
  Clock,
  Award,
  Check,
  X,
  ChevronDown,
  FileSpreadsheet,
  Users,
  Pencil,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  BookOpen,
  GraduationCap,
  Trash2,
  MapPin,
  CheckCheck,
  ArrowLeftRight,
  ChevronRight,
  Tag,
} from "lucide-react-native";
import Header from "../../components/Header";
import { FullPageLoader } from "../../components/LoadingSkeleton";
import api from "../../api/client";
import { colors, spacing, radius, shadows } from "../../styles/theme";

// ─── Grade Utilities ────────────────────────────────────────────────────────
const calculateGrade = (marks, maxMarks = 100) => {
  if (marks === "" || marks === undefined || marks === null || isNaN(marks)) return "—";
  const pct = (parseFloat(marks) / (parseFloat(maxMarks) || 100)) * 100;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
};

const getGradeColor = (grade) => {
  if (!grade || grade === "—") return colors.textMuted;
  if (grade === "A+") return "#10b981";
  if (grade === "A") return "#16a34a";
  if (grade === "B") return "#3b82f6";
  if (grade === "C") return "#f59e0b";
  if (grade === "D") return "#f97316";
  return "#ef4444";
};

// ─── Helper: Check if Exam is Finished (Past) or Pending (Upcoming) ─────────
const isExamFinished = (examDateStr, timeSlotStr) => {
  if (!examDateStr) return false;
  const examDateObj = new Date(examDateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const examDay = new Date(examDateObj.getFullYear(), examDateObj.getMonth(), examDateObj.getDate());

  if (examDay < today) return true;
  if (examDay > today) return false;

  // Same day: check timeSlot end time (e.g. "10:00 AM - 12:00 PM")
  if (timeSlotStr && timeSlotStr.includes("-")) {
    try {
      const parts = timeSlotStr.split("-");
      if (parts.length > 1) {
        const endTimeStr = parts[1].trim();
        const match = endTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const ampm = match[3].toUpperCase();
          if (ampm === "PM" && hours < 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;

          const examEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
          return now > examEndTime;
        }
      }
    } catch (e) {
      console.error("Error parsing time slot:", e);
    }
  }
  return false;
};

// ─── Feedback Banner ────────────────────────────────────────────────────────
const Banner = ({ type, message, onDismiss }) => {
  if (!message) return null;
  const isErr = type === "error";
  return (
    <View style={[bs.wrap, isErr ? bs.err : bs.ok]}>
      {isErr ? <AlertCircle size={15} color="#EF4444" /> : <CheckCircle size={15} color="#10B981" />}
      <Text style={[bs.txt, { color: isErr ? "#EF4444" : "#10B981" }]}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={14} color={isErr ? "#EF4444" : "#10B981"} />
      </TouchableOpacity>
    </View>
  );
};

const bs = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.md,
    padding: 12,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  err: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  ok: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },
  txt: { flex: 1, fontSize: 13, fontWeight: "600" },
});

// ─── Main Screen Component ──────────────────────────────────────────────────
const TeacherExamsScreen = ({ navigation }) => {
  // Raw Data from Backend: { schedules: [], students: [], results: [] }
  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState({ type: "", message: "" });

  // Scheduled Exams filter: "all" | "pending" | "finished" & Term filter
  const [examStatusFilter, setExamStatusFilter] = useState("all");
  const [selectedScheduleTermFilter, setSelectedScheduleTermFilter] = useState("all");
  const [showScheduleTermPicker, setShowScheduleTermPicker] = useState(false);
  const [showFabActionSheet, setShowFabActionSheet] = useState(false);

  // Published Marks Filter & Search states
  const [selectedExamFilter, setSelectedExamFilter] = useState("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [marksSearch, setMarksSearch] = useState("");

  // ─── Schedule / Edit Exam Modal States ────────────────────────────────────
  const [showExamModal, setShowExamModal] = useState(false);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);

  // Form Fields matching web portal exactly
  const [term, setTerm] = useState("");
  const [isCustomTerm, setIsCustomTerm] = useState(false);
  const [customTermInput, setCustomTermInput] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("12:00 PM");
  const [roomNumber, setRoomNumber] = useState("Lab 301");
  const [maxMarks, setMaxMarks] = useState("100");

  // Secondary pickers for Term & Subject inside Exam Form
  const [showTermPicker, setShowTermPicker] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  // Bulk Mark Entry Modal
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [selectedScheduleIdForMarks, setSelectedScheduleIdForMarks] = useState(null);
  const [marksTableData, setMarksTableData] = useState([]);
  const [marksEntrySearch, setMarksEntrySearch] = useState("");
  const [submittingMarks, setSubmittingMarks] = useState(false);

  // Delete Exam confirmation modal
  const [deletingExam, setDeletingExam] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showBanner = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: "", message: "" }), 4000);
  };

  // ─── Fetch API Data ───────────────────────────────────────────────────────
  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [examsRes, subjectsRes] = await Promise.all([
        api.get("/teacher/exams").catch(() => ({ data: { schedules: [], students: [], results: [] } })),
        api.get("/teacher/subjects").catch(() => ({ data: [] })),
      ]);

      const examsData = examsRes.data || {};
      const scList = Array.isArray(examsData.schedules) ? examsData.schedules : [];
      const stList = Array.isArray(examsData.students) ? examsData.students : [];
      const resList = Array.isArray(examsData.results) ? examsData.results : [];
      const subList = Array.isArray(subjectsRes.data) ? subjectsRes.data : [];

      setSchedules(scList);
      setStudents(stList);
      setResults(resList);
      setSubjects(subList);

      if (subList.length > 0 && !subjectId) {
        setSubjectId(String(subList[0].subject_id || subList[0].id || 1));
      }
    } catch (err) {
      console.error("Error fetching exams data:", err);
      showBanner("error", "Failed to load examination data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  // Unique exam terms for dropdown
  const allUniqueTerms = useMemo(() => {
    const terms = (schedules || []).map((sc) => sc.term || sc.examName).filter(Boolean);
    return Array.from(new Set(terms));
  }, [schedules]);

  // Formatted exam slot preview string
  const formattedExamSlot = useMemo(() => {
    const s = startTime.trim();
    const e = endTime.trim();
    if (!s && !e) return "10:00 AM - 12:00 PM";
    if (s && !e) return s;
    return `${s} - ${e}`;
  }, [startTime, endTime]);

  // ─── Scheduled Exams Pending / Finished Filter ────────────────────────────
  const pendingCount = useMemo(() => {
    return schedules.filter((sc) => !isExamFinished(sc.examDate, sc.timeSlot)).length;
  }, [schedules]);

  const finishedCount = useMemo(() => {
    return schedules.filter((sc) => isExamFinished(sc.examDate, sc.timeSlot)).length;
  }, [schedules]);

  const statusFilteredSchedules = useMemo(() => {
    return schedules.filter((sc) => {
      const finished = isExamFinished(sc.examDate, sc.timeSlot);
      if (examStatusFilter === "pending") return !finished;
      if (examStatusFilter === "finished") return finished;
      return true; // "all"
    });
  }, [schedules, examStatusFilter]);

  const filteredSchedules = useMemo(() => {
    return statusFilteredSchedules.filter((sc) => {
      if (selectedScheduleTermFilter === "all") return true;
      return (sc.term || sc.examName) === selectedScheduleTermFilter;
    });
  }, [statusFilteredSchedules, selectedScheduleTermFilter]);

  // ─── Schedule / Edit Exam Logic ───────────────────────────────────────────
  const handleOpenNewExamModal = () => {
    setEditingExamId(null);
    const defaultTerm = allUniqueTerms.length > 0 ? allUniqueTerms[0] : "Mid-Term Examination 2026";
    setTerm(defaultTerm);
    setIsCustomTerm(allUniqueTerms.length === 0);
    setCustomTermInput("");
    setSubjectId(String(subjects[0]?.subject_id || subjects[0]?.id || 1));
    setExamDate(new Date().toISOString().split("T")[0]); // e.g. "2026-09-07"
    setStartTime("10:00 AM");
    setEndTime("12:00 PM");
    setRoomNumber("Lab 301");
    setMaxMarks("100");
    setShowExamModal(true);
  };

  const handleOpenEditExamModal = (sc) => {
    setEditingExamId(sc.id);
    const examTermName = sc.term || sc.examName || "Mid-Term Examination 2026";
    setTerm(examTermName);
    setIsCustomTerm(!allUniqueTerms.includes(examTermName));
    setCustomTermInput(examTermName);
    setSubjectId(String(sc.subjectId || subjects[0]?.subject_id || 1));
    setExamDate(sc.examDate ? sc.examDate.split("T")[0] : "");

    if (sc.timeSlot && sc.timeSlot.includes("-")) {
      const [s, e] = sc.timeSlot.split("-").map((t) => t.trim());
      setStartTime(s || "10:00 AM");
      setEndTime(e || "12:00 PM");
    } else {
      setStartTime("10:00 AM");
      setEndTime("12:00 PM");
    }

    setRoomNumber(sc.roomNumber || "Lab 301");
    setMaxMarks(String(sc.maxMarks || 100));
    setShowExamModal(true);
  };

  const handleSaveExam = async () => {
    const finalExamName = (isCustomTerm || allUniqueTerms.length === 0)
      ? customTermInput.trim()
      : term.trim();

    if (!finalExamName) {
      Alert.alert("Missing Field", "Please specify an Examination Name / Term.");
      return;
    }

    if (!examDate.trim()) {
      Alert.alert("Missing Field", "Please select or enter an Exam Date (YYYY-MM-DD).");
      return;
    }

    setSubmittingExam(true);
    try {
      const payload = {
        term: finalExamName,
        examName: finalExamName,
        subjectId: parseInt(subjectId, 10) || 1,
        classId: 1,
        examDate: examDate.trim(),
        timeSlot: formattedExamSlot,
        roomNumber: roomNumber.trim() || "Lab 301",
        maxMarks: parseInt(maxMarks, 10) || 100,
      };

      if (editingExamId) {
        await api.put(`/teacher/exams/${editingExamId}`, payload);
        showBanner("success", "Examination schedule updated successfully!");
      } else {
        await api.post("/teacher/exams", payload);
        showBanner("success", "New examination scheduled successfully!");
      }

      setShowExamModal(false);
      fetchData(true);
    } catch (err) {
      console.error("Save exam error:", err);
      showBanner("error", err.response?.data?.message || "Failed to save examination schedule.");
    } finally {
      setSubmittingExam(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!deletingExam) return;
    setIsDeleting(true);
    try {
      await api.delete(`/teacher/exams/${deletingExam.id}`);
      showBanner("success", `"${deletingExam.examName || deletingExam.term}" deleted.`);
      setDeletingExam(null);
      fetchData(true);
    } catch (err) {
      console.error("Delete exam error:", err);
      showBanner("error", "Failed to delete exam schedule.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Mark Entry Logic ─────────────────────────────────────────────────────
  const handleOpenMarkEntry = (targetScheduleId = null) => {
    const scId = targetScheduleId || selectedScheduleIdForMarks || schedules[0]?.id;
    if (!scId) {
      Alert.alert("No Scheduled Exams", "Please schedule an examination first.");
      return;
    }

    setSelectedScheduleIdForMarks(scId);
    setMarksEntrySearch("");
    initMarksTableData(scId);
    setShowMarksModal(true);
  };

  const initMarksTableData = (scId) => {
    const sc = schedules.find((s) => String(s.id) === String(scId)) || schedules[0];
    const maxM = sc?.maxMarks || 100;

    const initialRows = students.map((st) => {
      const existing = results.find(
        (r) => String(r.exam_schedule_id) === String(scId) && String(r.student_id) === String(st.id)
      );

      const mVal = existing?.marks_obtained !== undefined && existing?.marks_obtained !== null
        ? String(existing.marks_obtained)
        : "";

      return {
        studentId: st.id,
        studentName: st.name,
        rollNumber: st.rollNumber || "—",
        marksObtained: mVal,
        grade: existing?.grade || calculateGrade(mVal, maxM),
        remarks: existing?.remarks || "",
      };
    });

    setMarksTableData(initialRows);
  };

  const handleUpdateStudentMark = (studentId, val) => {
    setMarksTableData((prev) =>
      prev.map((row) => {
        if (row.studentId === studentId) {
          const sc = schedules.find((s) => String(s.id) === String(selectedScheduleIdForMarks));
          const maxM = sc?.maxMarks || 100;
          return {
            ...row,
            marksObtained: val,
            grade: calculateGrade(val, maxM),
          };
        }
        return row;
      })
    );
  };

  const handleUpdateStudentRemark = (studentId, val) => {
    setMarksTableData((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, remarks: val } : row))
    );
  };

  const handleSubmitBulkMarks = async () => {
    const currentSc = schedules.find((s) => String(s.id) === String(selectedScheduleIdForMarks));
    if (!currentSc) return;

    const validRows = marksTableData.filter(
      (r) => r.marksObtained !== "" && r.marksObtained !== undefined && !isNaN(r.marksObtained)
    );

    if (validRows.length === 0) {
      Alert.alert("No Marks Entered", "Please enter marks for at least one student.");
      return;
    }

    setSubmittingMarks(true);
    try {
      const payload = {
        examScheduleId: currentSc.id,
        subjectId: currentSc.subjectId || 1,
        marksData: validRows.map((r) => ({
          studentId: r.studentId,
          marksObtained: parseFloat(r.marksObtained),
          grade: r.grade,
          remarks: r.remarks,
        })),
      };

      await api.post("/teacher/exams/marks-bulk", payload);
      showBanner("success", `Published marks for ${validRows.length} students!`);
      setShowMarksModal(false);
      fetchData(true);
    } catch (err) {
      console.error("Error submitting marks:", err);
      showBanner("error", err.response?.data?.message || "Failed to publish marks.");
    } finally {
      setSubmittingMarks(false);
    }
  };

  // ─── Filtered Published Marks Table ───────────────────────────────────────
  const filteredResults = useMemo(() => {
    let list = results;
    if (selectedExamFilter !== "all") {
      list = list.filter((r) => String(r.exam_schedule_id) === String(selectedExamFilter));
    }

    if (marksSearch.trim()) {
      const q = marksSearch.trim().toLowerCase();
      list = list.filter((r) => {
        const st = students.find((s) => String(s.id) === String(r.student_id));
        const exam = schedules.find((e) => String(e.id) === String(r.exam_schedule_id));
        return (
          st?.name?.toLowerCase().includes(q) ||
          st?.rollNumber?.toLowerCase().includes(q) ||
          exam?.examName?.toLowerCase().includes(q) ||
          r.remarks?.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [results, selectedExamFilter, marksSearch, students, schedules]);

  // Performance Summary when a specific exam is selected
  const examSummary = useMemo(() => {
    if (selectedExamFilter === "all") return null;
    const currentSc = schedules.find((s) => String(s.id) === String(selectedExamFilter));
    const examResults = results.filter((r) => String(r.exam_schedule_id) === String(selectedExamFilter));
    if (!currentSc || examResults.length === 0) return null;

    const total = examResults.reduce((acc, r) => acc + (parseFloat(r.marks_obtained) || 0), 0);
    const avg = (total / examResults.length).toFixed(1);
    const max = Math.max(...examResults.map((r) => parseFloat(r.marks_obtained) || 0));

    return {
      examName: currentSc.examName,
      subjectName: currentSc.subjectName,
      gradedCount: examResults.length,
      average: avg,
      highest: max,
      maxMarks: currentSc.maxMarks || 100,
    };
  }, [selectedExamFilter, schedules, results]);

  // Filtered students inside marks modal search
  const filteredMarksModalRows = useMemo(() => {
    if (!marksEntrySearch.trim()) return marksTableData;
    const q = marksEntrySearch.trim().toLowerCase();
    return marksTableData.filter(
      (r) => r.studentName.toLowerCase().includes(q) || r.rollNumber.toLowerCase().includes(q)
    );
  }, [marksTableData, marksEntrySearch]);

  const selectedExamLabel = useMemo(() => {
    if (selectedExamFilter === "all") return `All Examinations (${results.length})`;
    const sc = schedules.find((s) => String(s.id) === String(selectedExamFilter));
    const count = results.filter((r) => String(r.exam_schedule_id) === String(sc?.id)).length;
    return `${sc?.examName || "Exam"} (${count} graded)`;
  }, [selectedExamFilter, schedules, results]);

  const selectedSubjectObj = useMemo(() => {
    return subjects.find((s) => String(s.subject_id || s.id) === String(subjectId)) || subjects[0];
  }, [subjects, subjectId]);

  if (loading) return <FullPageLoader message="Loading examination schedules and marks..." />;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Header
        title="Exams & Marks"
        subtitle="Examination & Marks Management"
        showBack
        navigation={navigation}
      />

      <Banner
        type={banner.type}
        message={banner.message}
        onDismiss={() => setBanner({ type: "", message: "" })}
      />

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Scheduled Examinations Section Header & Filter Tabs ─────────── */}
        <View style={styles.scheduledHeaderContainer}>
          <View style={styles.scheduledTitleRow}>
            <Text style={styles.sectionTitle}>Scheduled Examinations</Text>
            <Text style={styles.sectionSubCount}>
              {filteredSchedules.length} of {schedules.length}
            </Text>
          </View>

          {/* Pending / Finished / All Filter Pills */}
          <View style={styles.statusSegmentRow}>
            <TouchableOpacity
              style={[styles.statusTab, examStatusFilter === "all" && styles.statusTabActive]}
              onPress={() => setExamStatusFilter("all")}
              activeOpacity={0.7}
            >
              <Text style={[styles.statusTabText, examStatusFilter === "all" && styles.statusTabTextActive]}>
                All
              </Text>
              <View style={[styles.statusCountBadge, examStatusFilter === "all" && styles.statusCountBadgeActive]}>
                <Text style={[styles.statusCountText, examStatusFilter === "all" && styles.statusCountTextActive]}>
                  {schedules.length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusTab, examStatusFilter === "pending" && styles.statusTabActivePending]}
              onPress={() => setExamStatusFilter("pending")}
              activeOpacity={0.7}
            >
              <Clock size={11} color={examStatusFilter === "pending" ? "#f59e0b" : colors.textMuted} />
              <Text style={[styles.statusTabText, examStatusFilter === "pending" && styles.statusTabTextActivePending]}>
                Pending
              </Text>
              <View style={[styles.statusCountBadge, examStatusFilter === "pending" && styles.statusCountBadgeActivePending]}>
                <Text style={[styles.statusCountText, examStatusFilter === "pending" && styles.statusCountTextActivePending]}>
                  {pendingCount}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusTab, examStatusFilter === "finished" && styles.statusTabActiveFinished]}
              onPress={() => setExamStatusFilter("finished")}
              activeOpacity={0.7}
            >
              <CheckCheck size={12} color={examStatusFilter === "finished" ? "#10b981" : colors.textMuted} />
              <Text style={[styles.statusTabText, examStatusFilter === "finished" && styles.statusTabTextActiveFinished]}>
                Finished
              </Text>
              <View style={[styles.statusCountBadge, examStatusFilter === "finished" && styles.statusCountBadgeActiveFinished]}>
                <Text style={[styles.statusCountText, examStatusFilter === "finished" && styles.statusCountTextActiveFinished]}>
                  {finishedCount}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Term Filter Dropdown Trigger Button */}
          {allUniqueTerms.length > 0 && (
            <TouchableOpacity
              style={styles.termDropdownBtn}
              onPress={() => setShowScheduleTermPicker(true)}
              activeOpacity={0.75}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flex: 1, minWidth: 0 }}>
                <Tag size={13} color={colors.primary} />
                <Text style={styles.termDropdownLabel}>Term:</Text>
                <Text style={styles.termDropdownVal} numberOfLines={1}>
                  {selectedScheduleTermFilter === "all"
                    ? `All Terms (${statusFilteredSchedules.length})`
                    : `${selectedScheduleTermFilter} (${statusFilteredSchedules.filter((sc) => (sc.term || sc.examName) === selectedScheduleTermFilter).length})`}
                </Text>
              </View>
              <ChevronDown size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Scheduled Exam Cards List ──────────────────────────────────── */}
        {filteredSchedules.length === 0 ? (
          <View style={[styles.emptyCard, shadows.sm]}>
            {selectedScheduleTermFilter !== "all" ? (
              <>
                <CalendarDays size={32} color={colors.textMuted} />
                <Text style={styles.emptyCardText}>
                  No examinations found for "{selectedScheduleTermFilter}" in {examStatusFilter} status.
                </Text>
                <TouchableOpacity
                  style={[styles.actionBtnSecondary, { alignSelf: "center", paddingHorizontal: 16, marginTop: 6 }]}
                  onPress={() => setSelectedScheduleTermFilter("all")}
                >
                  <Text style={styles.actionBtnSecondaryText}>Clear Term Filter</Text>
                </TouchableOpacity>
              </>
            ) : examStatusFilter === "pending" ? (
              <>
                <Clock size={32} color="#f59e0b" />
                <Text style={styles.emptyCardText}>
                  No pending exams. All scheduled examinations have been completed.
                </Text>
                <TouchableOpacity
                  style={[styles.actionBtnSecondary, { alignSelf: "center", paddingHorizontal: 16, marginTop: 4 }]}
                  onPress={handleOpenNewExamModal}
                >
                  <Plus size={14} color={colors.textPrimary} />
                  <Text style={styles.actionBtnSecondaryText}>Schedule New Exam</Text>
                </TouchableOpacity>
              </>
            ) : examStatusFilter === "finished" ? (
              <>
                <CheckCheck size={32} color="#10b981" />
                <Text style={styles.emptyCardText}>
                  No finished exams yet. Completed exams will appear here once their scheduled date passes.
                </Text>
              </>
            ) : (
              <>
                <CalendarDays size={32} color={colors.textMuted} />
                <Text style={styles.emptyCardText}>
                  No active upcoming exams scheduled. Click "Schedule Exam" to add one.
                </Text>
              </>
            )}
          </View>
        ) : (
          filteredSchedules.map((sc) => {
            const finished = isExamFinished(sc.examDate, sc.timeSlot);
            const examTitle = sc.examName || sc.term || "Examination";
            const showDifferentTerm =
              sc.term &&
              sc.term.trim().toLowerCase() !== (sc.examName || "").trim().toLowerCase();

            return (
              <TouchableOpacity
                key={sc.id}
                style={[
                  styles.examCardPerfected,
                  shadows.sm,
                  { borderLeftColor: finished ? "#10b981" : "#f59e0b" },
                ]}
                onPress={() => handleOpenMarkEntry(sc.id)}
                activeOpacity={0.85}
              >
                {/* ─── Row 1: Subject Badge on Left, Status + Actions on Right ─── */}
                <View style={styles.cardHeaderRow}>
                  {/* Subject & Class Tag Pill */}
                  <View style={styles.cardSubjectPill}>
                    <BookOpen size={12} color="#818cf8" />
                    <Text style={styles.cardSubjectPillText} numberOfLines={1}>
                      {sc.subjectName || "General Subject"}
                    </Text>
                    <Text style={styles.cardSubjectDot}>•</Text>
                    <Text style={styles.cardClassPillText} numberOfLines={1}>
                      {sc.className || "CS101-A"}
                    </Text>
                  </View>

                  {/* Right: Status Pill + Compact Action Icon Buttons */}
                  <View style={styles.cardHeaderRightGroup}>
                    {/* Status Badge */}
                    <View
                      style={[
                        styles.cardStatusBadge,
                        finished ? styles.cardStatusBadgeFinished : styles.cardStatusBadgePending,
                      ]}
                    >
                      {finished ? (
                        <CheckCheck size={11} color="#10b981" />
                      ) : (
                        <Clock size={11} color="#f59e0b" />
                      )}
                      <Text
                        style={[
                          styles.cardStatusBadgeText,
                          { color: finished ? "#10b981" : "#f59e0b" },
                        ]}
                      >
                        {finished ? "Finished" : "Pending"}
                      </Text>
                    </View>

                    {/* Compact Edit Icon Button */}
                    <TouchableOpacity
                      style={styles.cardCompactActionBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleOpenEditExamModal(sc);
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      activeOpacity={0.7}
                    >
                      <Pencil size={12} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {/* Compact Delete Icon Button */}
                    <TouchableOpacity
                      style={[styles.cardCompactActionBtn, styles.cardCompactDeleteBtn]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setDeletingExam(sc);
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={12} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ─── Row 2: Exam Name & Optional Term Subtitle ─── */}
                <View style={styles.cardTitleContainer}>
                  <Text style={styles.cardExamTitle} numberOfLines={2}>
                    {examTitle}
                  </Text>
                  {showDifferentTerm && (
                    <View style={styles.cardTermTagRow}>
                      <Tag size={11} color={colors.primary} />
                      <Text style={styles.cardTermTagText}>Term: {sc.term}</Text>
                    </View>
                  )}
                </View>

                {/* ─── Row 3: Structured 2x2 Detail Matrix ─── */}
                <View style={styles.cardMatrixBox}>
                  {/* Sub-row 1: Date & Time Slot */}
                  <View style={styles.cardMatrixRow}>
                    {/* Date Cell */}
                    <View style={styles.cardMatrixCell}>
                      <View
                        style={[
                          styles.matrixIconWrap,
                          { backgroundColor: "rgba(99, 102, 241, 0.14)" },
                        ]}
                      >
                        <CalendarDays size={13} color="#818cf8" />
                      </View>
                      <View style={styles.matrixTextWrap}>
                        <Text style={styles.matrixLabel}>DATE</Text>
                        <Text style={styles.matrixVal} numberOfLines={1}>
                          {sc.examDate
                            ? new Date(sc.examDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </Text>
                      </View>
                    </View>

                    {/* Time Slot Cell */}
                    <View style={styles.cardMatrixCell}>
                      <View
                        style={[
                          styles.matrixIconWrap,
                          { backgroundColor: "rgba(245, 158, 11, 0.14)" },
                        ]}
                      >
                        <Clock size={13} color="#f59e0b" />
                      </View>
                      <View style={styles.matrixTextWrap}>
                        <Text style={styles.matrixLabel}>TIME SLOT</Text>
                        <Text style={styles.matrixVal} numberOfLines={1}>
                          {sc.timeSlot || "—"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Sub-row 2: Venue & Max Marks */}
                  <View style={[styles.cardMatrixRow, { marginTop: 8 }]}>
                    {/* Venue Cell */}
                    <View style={styles.cardMatrixCell}>
                      <View
                        style={[
                          styles.matrixIconWrap,
                          { backgroundColor: "rgba(16, 185, 129, 0.14)" },
                        ]}
                      >
                        <MapPin size={13} color="#10b981" />
                      </View>
                      <View style={styles.matrixTextWrap}>
                        <Text style={styles.matrixLabel}>VENUE</Text>
                        <Text style={styles.matrixVal} numberOfLines={1}>
                          {sc.roomNumber || "TBD"}
                        </Text>
                      </View>
                    </View>

                    {/* Max Marks Cell */}
                    <View style={styles.cardMatrixCell}>
                      <View
                        style={[
                          styles.matrixIconWrap,
                          { backgroundColor: "rgba(236, 72, 153, 0.14)" },
                        ]}
                      >
                        <Award size={13} color="#ec4899" />
                      </View>
                      <View style={styles.matrixTextWrap}>
                        <Text style={styles.matrixLabel}>MAX MARKS</Text>
                        <Text style={styles.matrixVal} numberOfLines={1}>
                          {sc.maxMarks || 100} Marks
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* ─── Published Student Marks Section ───────────────────────────── */}
        <View style={styles.publishedHeaderSection}>
          <View style={styles.publishedTitleRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={styles.sectionIconBadge}>
                <Award size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Published Student Marks</Text>
                <Text style={styles.sectionSub}>Filter student scores and grades by examination</Text>
              </View>
            </View>

            <View style={styles.scrollHintBadge}>
              <ArrowLeftRight size={11} color={colors.primary} />
              <Text style={styles.scrollHintText}>Swipe ↔</Text>
            </View>
          </View>
        </View>

        {/* Filter Chip Selector with Spacing */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.8}
          >
            <Filter size={14} color={colors.primary} />
            <Text style={styles.filterChipLabel}>Exam:</Text>
            <Text style={styles.filterChipValue} numberOfLines={1}>
              {selectedExamLabel}
            </Text>
            <ChevronDown size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Performance Summary Banner (when single exam is filtered) */}
        {examSummary && (
          <View style={[styles.summaryBanner, shadows.sm]}>
            <View style={{ marginBottom: spacing.xs }}>
              <Text style={styles.summarySub}>EXAM PERFORMANCE SUMMARY</Text>
              <Text style={styles.summaryTitle}>
                {examSummary.examName} ({examSummary.subjectName})
              </Text>
            </View>
            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatLabel}>TOTAL GRADED</Text>
                <Text style={[styles.summaryStatVal, { color: colors.primary }]}>
                  {examSummary.gradedCount} Students
                </Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatLabel}>CLASS AVERAGE</Text>
                <Text style={[styles.summaryStatVal, { color: "#10B981" }]}>
                  {examSummary.average} / {examSummary.maxMarks}
                </Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatLabel}>HIGHEST</Text>
                <Text style={[styles.summaryStatVal, { color: "#8B5CF6" }]}>
                  {examSummary.highest} / {examSummary.maxMarks}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Search published marks with Comfortable Spacing */}
        <View style={styles.searchWrap}>
          <Search size={15} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student by name, roll no, or remarks..."
            placeholderTextColor={colors.textMuted}
            value={marksSearch}
            onChangeText={setMarksSearch}
          />
          {!!marksSearch && (
            <TouchableOpacity onPress={() => setMarksSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={15} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Published Marks Table with Horizontal Scroll & Suitable Spacing ─── */}
        <View style={[styles.tableCard, shadows.sm]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tableInnerScrollContent}>
              {/* Table Header Row */}
              <View style={styles.tableHeaderRow}>
                <View style={styles.colExam}>
                  <Text style={styles.tableHeaderCol}>EXAM NAME</Text>
                </View>
                <View style={styles.colStudent}>
                  <Text style={styles.tableHeaderCol}>STUDENT NAME</Text>
                </View>
                <View style={styles.colRoll}>
                  <Text style={styles.tableHeaderCol}>ROLL NO</Text>
                </View>
                <View style={styles.colMarks}>
                  <Text style={styles.tableHeaderCol}>MARKS</Text>
                </View>
                <View style={styles.colGrade}>
                  <Text style={styles.tableHeaderCol}>GRADE</Text>
                </View>
                <View style={styles.colRemarks}>
                  <Text style={styles.tableHeaderCol}>REMARKS</Text>
                </View>
              </View>

              {/* Table Body Rows */}
              {filteredResults.length === 0 ? (
                <View style={styles.emptyTableWrap}>
                  <Text style={styles.emptyTableText}>
                    {results.length === 0
                      ? "No exam marks entered yet. Click \"Mark Entry & Edit\" above to input student marks."
                      : "No marks match your search or filter."}
                  </Text>
                </View>
              ) : (
                filteredResults.map((res, idx) => {
                  const st = students.find((s) => String(s.id) === String(res.student_id));
                  const exam = schedules.find((e) => String(e.id) === String(res.exam_schedule_id));
                  const isAlt = idx % 2 === 1;
                  const gColor = getGradeColor(res.grade);

                  return (
                    <View
                      key={res.id || idx}
                      style={[
                        styles.tableRow,
                        isAlt && styles.tableRowAlt,
                        idx === filteredResults.length - 1 && styles.tableRowLast,
                      ]}
                    >
                      {/* 1. Exam Name */}
                      <View style={styles.colExam}>
                        <Text style={styles.cellExamName} numberOfLines={2}>
                          {exam?.examName || exam?.term || "Exam"}
                        </Text>
                        {!!exam?.subjectName && (
                          <Text style={styles.cellExamSub} numberOfLines={1}>
                            {exam.subjectName}
                          </Text>
                        )}
                      </View>

                      {/* 2. Student Name */}
                      <View style={styles.colStudent}>
                        <Text style={styles.cellStudentName} numberOfLines={1}>
                          {st?.name || `Student #${res.student_id}`}
                        </Text>
                      </View>

                      {/* 3. Roll No */}
                      <View style={styles.colRoll}>
                        <Text style={styles.cellRoll} numberOfLines={1}>
                          {st?.rollNumber || "—"}
                        </Text>
                      </View>

                      {/* 4. Marks */}
                      <View style={styles.colMarks}>
                        <Text style={styles.cellMarks}>
                          {res.marks_obtained}
                          <Text style={styles.cellMaxMarks}> / {exam?.maxMarks || 100}</Text>
                        </Text>
                      </View>

                      {/* 5. Grade Badge */}
                      <View style={styles.colGrade}>
                        <View style={[styles.gradePill, { backgroundColor: gColor + "20", borderColor: gColor + "40" }]}>
                          <Text style={[styles.gradePillText, { color: gColor }]}>
                            {res.grade || "—"}
                          </Text>
                        </View>
                      </View>

                      {/* 6. Remarks */}
                      <View style={styles.colRemarks}>
                        <Text style={styles.cellRemarksText} numberOfLines={2}>
                          {res.remarks ? `"${res.remarks}"` : "—"}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* ─── Schedule / Edit Exam Modal (Matching Web Exactly) ─────────────── */}
      <Modal
        visible={showExamModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExamModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          {/* Decoupled backdrop touch */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowExamModal(false)}
          />

          <View style={[styles.webStyleModalCard, shadows.lg]}>
            {/* Modal Header */}
            <View style={styles.webModalHeader}>
              <Text style={styles.webModalTitle}>
                {editingExamId ? "Edit Examination Schedule" : "Schedule New Examination"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowExamModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {/* Field 1: Examination Name / Term * */}
              <View style={styles.webFormGroup}>
                <Text style={styles.webFormLabel}>Examination Name / Term *</Text>
                {allUniqueTerms.length > 0 && !isCustomTerm ? (
                  <TouchableOpacity
                    style={styles.webSelectBox}
                    onPress={() => setShowTermPicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.webSelectValue} numberOfLines={1}>
                      {term || "Select Examination Term"}
                    </Text>
                    <ChevronDown size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : (
                  <View>
                    <TextInput
                      style={styles.webInput}
                      placeholder="Enter Examination Name (e.g. Mid-Term 2026, CIA 1)"
                      placeholderTextColor={colors.textMuted}
                      value={customTermInput}
                      onChangeText={setCustomTermInput}
                    />
                    {allUniqueTerms.length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setIsCustomTerm(false);
                          if (allUniqueTerms.length > 0) setTerm(allUniqueTerms[0]);
                        }}
                        style={{ marginTop: 6 }}
                      >
                        <Text style={styles.linkText}>
                          ← Choose from existing terms ({allUniqueTerms.join(", ")})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Field 2: Subject * */}
              <View style={styles.webFormGroup}>
                <Text style={styles.webFormLabel}>Subject *</Text>
                <TouchableOpacity
                  style={styles.webSelectBox}
                  onPress={() => setShowSubjectPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.webSelectValue} numberOfLines={1}>
                    {selectedSubjectObj?.subject_name || selectedSubjectObj?.name || "Select Subject"}
                  </Text>
                  <ChevronDown size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Field 3: Exam Date * */}
              <View style={styles.webFormGroup}>
                <Text style={styles.webFormLabel}>Exam Date *</Text>
                <View style={styles.inputWithIcon}>
                  <CalendarDays size={16} color={colors.primary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.webInputBare}
                    placeholder="YYYY-MM-DD (e.g. 2026-09-15)"
                    placeholderTextColor={colors.textMuted}
                    value={examDate}
                    onChangeText={setExamDate}
                  />
                </View>
              </View>

              {/* Field 4 & 5: Start Time * and End Time * (2 Columns) */}
              <View style={styles.webFormRow}>
                <View style={[styles.webFormGroup, { flex: 1 }]}>
                  <Text style={styles.webFormLabel}>Start Time *</Text>
                  <TextInput
                    style={styles.webInput}
                    placeholder="10:00 AM"
                    placeholderTextColor={colors.textMuted}
                    value={startTime}
                    onChangeText={setStartTime}
                  />
                </View>

                <View style={[styles.webFormGroup, { flex: 1 }]}>
                  <Text style={styles.webFormLabel}>End Time *</Text>
                  <TextInput
                    style={styles.webInput}
                    placeholder="12:00 PM"
                    placeholderTextColor={colors.textMuted}
                    value={endTime}
                    onChangeText={setEndTime}
                  />
                </View>
              </View>

              {/* Formatted Exam Slot Banner (exact matching web preview) */}
              <View style={styles.formattedSlotBanner}>
                <Text style={styles.formattedSlotLabel}>Formatted Exam Slot:</Text>
                <View style={styles.formattedSlotTimeRow}>
                  <Clock size={14} color={colors.primary} />
                  <Text style={styles.formattedSlotValue}>{formattedExamSlot}</Text>
                </View>
              </View>

              {/* Field 6 & 7: Venue / Room Number * and Max Marks (2 Columns) */}
              <View style={styles.webFormRow}>
                <View style={[styles.webFormGroup, { flex: 1.3 }]}>
                  <Text style={styles.webFormLabel}>Venue / Room Number *</Text>
                  <TextInput
                    style={styles.webInput}
                    placeholder="e.g. Lab 301"
                    placeholderTextColor={colors.textMuted}
                    value={roomNumber}
                    onChangeText={setRoomNumber}
                  />
                </View>

                <View style={[styles.webFormGroup, { flex: 0.9 }]}>
                  <Text style={styles.webFormLabel}>Max Marks</Text>
                  <TextInput
                    style={styles.webInput}
                    placeholder="100"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={maxMarks}
                    onChangeText={setMaxMarks}
                  />
                </View>
              </View>

              {/* Bottom Actions: Cancel & Save Schedule */}
              <View style={styles.webModalActions}>
                <TouchableOpacity
                  style={styles.webCancelBtn}
                  onPress={() => setShowExamModal(false)}
                >
                  <Text style={styles.webCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.webSaveBtn, submittingExam && { opacity: 0.6 }]}
                  onPress={handleSaveExam}
                  disabled={submittingExam}
                  activeOpacity={0.8}
                >
                  {submittingExam ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.webSaveBtnText}>
                      {editingExamId ? "Update Schedule" : "Save Schedule"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Term Picker Dropdown Sheet ──────────────────────────────────── */}
      <Modal
        visible={showTermPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTermPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTermPicker(false)}
        >
          <View style={[styles.pickerMenuCard, shadows.lg]}>
            <View style={styles.filterMenuHeader}>
              <Text style={styles.filterMenuTitle}>Select Examination Name / Term</Text>
              <TouchableOpacity onPress={() => setShowTermPicker(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280 }}>
              {allUniqueTerms.map((t) => {
                const isSel = !isCustomTerm && term === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.filterMenuItem, isSel && styles.filterMenuItemActive]}
                    onPress={() => {
                      setTerm(t);
                      setIsCustomTerm(false);
                      setShowTermPicker(false);
                    }}
                  >
                    <Text style={[styles.filterMenuItemText, isSel && styles.filterMenuItemTextActive]}>
                      {t}
                    </Text>
                    {isSel && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}

              {/* Option to create custom term */}
              <TouchableOpacity
                style={[styles.filterMenuItem, { borderTopWidth: 1, borderTopColor: colors.border }]}
                onPress={() => {
                  setIsCustomTerm(true);
                  setCustomTermInput("");
                  setShowTermPicker(false);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Plus size={15} color={colors.primary} />
                  <Text style={[styles.filterMenuItemText, { color: colors.primary, fontWeight: "700" }]}>
                    + Create New Examination / Term...
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Subject Picker Dropdown Sheet ───────────────────────────────── */}
      <Modal
        visible={showSubjectPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSubjectPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSubjectPicker(false)}
        >
          <View style={[styles.pickerMenuCard, shadows.lg]}>
            <View style={styles.filterMenuHeader}>
              <Text style={styles.filterMenuTitle}>Select Subject</Text>
              <TouchableOpacity onPress={() => setShowSubjectPicker(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280 }}>
              {subjects.map((s) => {
                const sid = String(s.subject_id || s.id);
                const isSel = String(subjectId) === sid;
                return (
                  <TouchableOpacity
                    key={sid}
                    style={[styles.filterMenuItem, isSel && styles.filterMenuItemActive]}
                    onPress={() => {
                      setSubjectId(sid);
                      setShowSubjectPicker(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.filterMenuItemText, isSel && styles.filterMenuItemTextActive]}>
                        📚 {s.subject_name || s.name}
                      </Text>
                      {!!s.class_name && (
                        <Text style={styles.filterMenuItemSub}>{s.class_name}</Text>
                      )}
                    </View>
                    {isSel && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Whole-Class Mark Entry Full Modal ────────────────────────────── */}
      <Modal
        visible={showMarksModal}
        animationType="slide"
        onRequestClose={() => setShowMarksModal(false)}
      >
        <SafeAreaView style={styles.fullModalContainer} edges={["top", "left", "right", "bottom"]}>
          {/* Modal Header */}
          <View style={styles.marksModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.marksModalSuper}>WHOLE-CLASS MARK ENTRY & EDIT</Text>
              <Text style={styles.marksModalTitle}>Input & Publish Student Exam Marks</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowMarksModal(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Exam Selector Inside Marks Modal */}
          <View style={styles.marksModalSelectorBar}>
            <Text style={styles.marksModalSelectorLabel}>Exam:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", gap: 6, paddingVertical: 2 }}>
                {schedules.map((sc) => {
                  const isSel = String(sc.id) === String(selectedScheduleIdForMarks);
                  return (
                    <TouchableOpacity
                      key={sc.id}
                      style={[styles.scPill, isSel && styles.scPillActive]}
                      onPress={() => {
                        setSelectedScheduleIdForMarks(sc.id);
                        initMarksTableData(sc.id);
                      }}
                    >
                      <Text style={[styles.scPillText, isSel && styles.scPillTextActive]}>
                        {sc.examName || sc.term} ({sc.subjectName || "Subject"})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Student Search within Marks Modal */}
          <View style={styles.marksModalSearchWrap}>
            <Search size={14} color={colors.textMuted} />
            <TextInput
              style={styles.marksModalSearchInput}
              placeholder="Search student by name or roll number..."
              placeholderTextColor={colors.textMuted}
              value={marksEntrySearch}
              onChangeText={setMarksEntrySearch}
            />
            {!!marksEntrySearch && (
              <TouchableOpacity onPress={() => setMarksEntrySearch("")}>
                <X size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Marks Entry Table Header */}
          <View style={styles.entryTableHeader}>
            <View style={{ flex: 1.4 }}>
              <Text style={styles.entryHeaderCol}>STUDENT</Text>
            </View>
            <View style={{ width: 72 }}>
              <Text style={styles.entryHeaderCol}>MARKS</Text>
            </View>
            <View style={{ width: 44, alignItems: "center" }}>
              <Text style={styles.entryHeaderCol}>GRADE</Text>
            </View>
            <View style={{ flex: 1.2 }}>
              <Text style={styles.entryHeaderCol}>REMARKS</Text>
            </View>
          </View>

          {/* Marks Entry Rows */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 90 }}
            keyboardShouldPersistTaps="handled"
          >
            {filteredMarksModalRows.map((row, idx) => {
              const gColor = getGradeColor(row.grade);
              const isAlt = idx % 2 === 1;

              return (
                <View
                  key={row.studentId}
                  style={[styles.entryRow, isAlt && styles.tableRowAlt]}
                >
                  <View style={{ flex: 1.4, paddingRight: 6 }}>
                    <Text style={styles.entryStudentName} numberOfLines={1}>
                      {row.studentName}
                    </Text>
                    <Text style={styles.entryRollText}>Roll: {row.rollNumber}</Text>
                  </View>

                  <View style={{ width: 72, paddingRight: 6 }}>
                    <TextInput
                      style={styles.entryMarksInput}
                      placeholder="—"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={row.marksObtained}
                      onChangeText={(v) => handleUpdateStudentMark(row.studentId, v)}
                    />
                  </View>

                  <View style={{ width: 44, alignItems: "center" }}>
                    <View style={[styles.gradePill, { backgroundColor: gColor + "20" }]}>
                      <Text style={[styles.gradePillText, { color: gColor }]}>
                        {row.grade || "—"}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flex: 1.2, paddingLeft: 6 }}>
                    <TextInput
                      style={styles.entryRemarkInput}
                      placeholder="Remarks..."
                      placeholderTextColor={colors.textMuted}
                      value={row.remarks}
                      onChangeText={(v) => handleUpdateStudentRemark(row.studentId, v)}
                    />
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Sticky Bottom Save / Publish Bar */}
          <View style={styles.marksModalBottomBar}>
            <TouchableOpacity
              style={[styles.publishFullBtn, submittingMarks && { opacity: 0.6 }]}
              onPress={handleSubmitBulkMarks}
              disabled={submittingMarks}
              activeOpacity={0.8}
            >
              {submittingMarks ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.publishFullBtnText}>Submit & Publish All Marks</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ─── Scheduled Exams Term Filter Dropdown Modal ──────────────────── */}
      <Modal
        visible={showScheduleTermPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowScheduleTermPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowScheduleTermPicker(false)}
        >
          <View style={[styles.pickerMenuCard, shadows.lg]}>
            <View style={styles.filterMenuHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Tag size={17} color={colors.primary} />
                <Text style={styles.filterMenuTitle}>Filter by Examination Term</Text>
              </View>
              <TouchableOpacity onPress={() => setShowScheduleTermPicker(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              <TouchableOpacity
                style={[
                  styles.filterMenuItem,
                  selectedScheduleTermFilter === "all" && styles.filterMenuItemActive,
                ]}
                onPress={() => {
                  setSelectedScheduleTermFilter("all");
                  setShowScheduleTermPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.filterMenuItemText,
                    selectedScheduleTermFilter === "all" && styles.filterMenuItemTextActive,
                  ]}
                >
                  All Terms ({statusFilteredSchedules.length})
                </Text>
                {selectedScheduleTermFilter === "all" && <Check size={16} color={colors.primary} />}
              </TouchableOpacity>

              {allUniqueTerms.map((termName) => {
                const count = statusFilteredSchedules.filter(
                  (sc) => (sc.term || sc.examName) === termName
                ).length;
                const isSel = selectedScheduleTermFilter === termName;
                return (
                  <TouchableOpacity
                    key={termName}
                    style={[styles.filterMenuItem, isSel && styles.filterMenuItemActive]}
                    onPress={() => {
                      setSelectedScheduleTermFilter(termName);
                      setShowScheduleTermPicker(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.filterMenuItemText, isSel && styles.filterMenuItemTextActive]}>
                        🏷 {termName}
                      </Text>
                      <Text style={styles.filterMenuItemSub}>{count} scheduled</Text>
                    </View>
                    {isSel && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Exam Filter Dropdown Modal ───────────────────────────────────── */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={[styles.pickerMenuCard, shadows.lg]}>
            <View style={styles.filterMenuHeader}>
              <Text style={styles.filterMenuTitle}>Filter by Examination</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              <TouchableOpacity
                style={[
                  styles.filterMenuItem,
                  selectedExamFilter === "all" && styles.filterMenuItemActive,
                ]}
                onPress={() => {
                  setSelectedExamFilter("all");
                  setShowFilterModal(false);
                }}
              >
                <Text
                  style={[
                    styles.filterMenuItemText,
                    selectedExamFilter === "all" && styles.filterMenuItemTextActive,
                  ]}
                >
                  All Examinations ({results.length})
                </Text>
                {selectedExamFilter === "all" && <Check size={16} color={colors.primary} />}
              </TouchableOpacity>

              {schedules.map((sc) => {
                const count = results.filter(
                  (r) => String(r.exam_schedule_id) === String(sc.id)
                ).length;
                const isSelected = selectedExamFilter === String(sc.id);

                return (
                  <TouchableOpacity
                    key={sc.id}
                    style={[styles.filterMenuItem, isSelected && styles.filterMenuItemActive]}
                    onPress={() => {
                      setSelectedExamFilter(String(sc.id));
                      setShowFilterModal(false);
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text
                        style={[
                          styles.filterMenuItemText,
                          isSelected && styles.filterMenuItemTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {sc.examName || sc.term}
                      </Text>
                      <Text style={styles.filterMenuItemSub}>
                        {sc.subjectName || "Subject"} • {count} graded
                      </Text>
                    </View>
                    {isSelected && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Delete Confirmation Modal ───────────────────────────────────── */}
      <Modal
        visible={!!deletingExam}
        transparent
        animationType="fade"
        onRequestClose={() => setDeletingExam(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.deleteModalCard, shadows.lg]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Trash2 size={22} color="#EF4444" />
              <Text style={styles.deleteModalTitle}>Delete Examination?</Text>
            </View>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete "{deletingExam?.examName || deletingExam?.term}"? All associated student marks will also be permanently deleted.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeletingExam(null)}
                disabled={isDeleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalDangerBtn, isDeleting && { opacity: 0.6 }]}
                onPress={handleDeleteExam}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalDangerBtnText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Floating Action Button (FAB) ────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.fabBtn, shadows.lg]}
        onPress={() => setShowFabActionSheet(true)}
        activeOpacity={0.85}
      >
        <Plus size={26} color="#fff" />
      </TouchableOpacity>

      {/* ─── Examination & Marks Management Action Sheet ─────────────────── */}
      <Modal
        visible={showFabActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFabActionSheet(false)}
      >
        <TouchableOpacity
          style={styles.fabSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowFabActionSheet(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.fabSheetCard, shadows.lg]}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeaderRow}>
              <View style={styles.overviewIconWrap}>
                <GraduationCap size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.overviewTitle}>Examination & Marks Management</Text>
                <Text style={styles.overviewSub}>
                  Schedule examinations and input student grades. Results auto-sync to Student and Parent portals.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFabActionSheet(false)}
                style={styles.sheetCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.overviewActions}>
              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() => {
                  setShowFabActionSheet(false);
                  handleOpenNewExamModal();
                }}
                activeOpacity={0.8}
              >
                <Plus size={15} color={colors.textPrimary} />
                <Text style={styles.actionBtnSecondaryText}>Schedule Exam</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => {
                  setShowFabActionSheet(false);
                  handleOpenMarkEntry();
                }}
                activeOpacity={0.8}
              >
                <Pencil size={14} color="#fff" />
                <Text style={styles.actionBtnPrimaryText}>Mark Entry & Edit</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// ─── StyleSheet ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  mainScroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 80 },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },

  /* Top Overview Card */
  // Floating Action Button (FAB)
  fabBtn: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99,
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  // FAB Bottom Action Sheet Modal
  fabSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  fabSheetCard: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: Platform.OS === "ios" ? 40 : spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    width: "100%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: spacing.lg,
    alignItems: "flex-start",
  },
  sheetCloseBtn: {
    padding: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },

  /* Overview Card Styles (Used in Action Sheet) */
  overviewCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  overviewHeader: { flexDirection: "row", gap: 12, marginBottom: spacing.md },
  overviewIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  overviewTitle: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  overviewSub: { fontSize: 12, color: colors.textSecondary, marginTop: 3, lineHeight: 16 },
  overviewActions: { flexDirection: "row", gap: 8 },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.bgElevated,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnSecondaryText: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  actionBtnPrimaryText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  /* Scheduled Examinations Section Header & Filter Tabs */
  scheduledHeaderContainer: {
    marginBottom: spacing.sm,
    gap: 8,
  },
  scheduledTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: colors.textPrimary },
  sectionSubCount: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  sectionSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  /* Segmented Filter Pills Row */
  statusSegmentRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  statusTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  statusTabActive: {
    backgroundColor: colors.primary + "20",
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },
  statusTabActivePending: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  statusTabActiveFinished: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  statusTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  statusTabTextActive: {
    color: colors.primary,
  },
  statusTabTextActivePending: {
    color: "#f59e0b",
  },
  statusTabTextActiveFinished: {
    color: "#10b981",
  },
  statusCountBadge: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  statusCountBadgeActive: {
    backgroundColor: colors.primary,
  },
  statusCountBadgeActivePending: {
    backgroundColor: "#f59e0b",
  },
  statusCountBadgeActiveFinished: {
    backgroundColor: "#10b981",
  },
  statusCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
  },
  statusCountTextActive: {
    color: "#fff",
  },
  statusCountTextActivePending: {
    color: "#fff",
  },
  statusCountTextActiveFinished: {
    color: "#fff",
  },

  /* Term Dropdown Trigger */
  termDropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  termDropdownLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSecondary,
  },
  termDropdownVal: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
  },

  emptyCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyCardText: { fontSize: 12, color: colors.textMuted, textAlign: "center", lineHeight: 18 },

  /* ─── Perfected Exam Cards (Parity with Web Portal) ─── */
  examCardPerfected: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardSubjectPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
    flexShrink: 1,
  },
  cardSubjectPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#818cf8",
    flexShrink: 1,
  },
  cardSubjectDot: {
    fontSize: 10,
    color: "rgba(129, 140, 248, 0.5)",
    fontWeight: "800",
  },
  cardClassPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    flexShrink: 0,
  },
  cardHeaderRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 0,
  },
  cardStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  cardStatusBadgeFinished: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.28)",
  },
  cardStatusBadgePending: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.28)",
  },
  cardStatusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  cardCompactActionBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCompactDeleteBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  cardTitleContainer: {
    gap: 2,
  },
  cardExamTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  cardTermTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  cardTermTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  cardMatrixBox: {
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    padding: 10,
  },
  cardMatrixRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardMatrixCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
  },
  matrixIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  matrixTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  matrixLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  matrixVal: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  /* Published Marks Section Header */
  publishedHeaderSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  publishedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionIconBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollHintBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary + "15",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  scrollHintText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },

  /* Filter Bar with Generous Spacing */
  filterBar: {
    marginBottom: spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipLabel: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  filterChipValue: { flex: 1, fontSize: 12, fontWeight: "800", color: colors.textPrimary },

  /* Summary Banner */
  summaryBanner: {
    backgroundColor: colors.primary + "10",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + "35",
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  summarySub: { fontSize: 9, fontWeight: "800", color: colors.primary, letterSpacing: 0.5 },
  summaryTitle: { fontSize: 13, fontWeight: "800", color: colors.textPrimary, marginTop: 1 },
  summaryStatsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  summaryStatItem: { alignItems: "center", flex: 1 },
  summaryStatLabel: { fontSize: 8, fontWeight: "800", color: colors.textMuted },
  summaryStatVal: { fontSize: 13, fontWeight: "900", marginTop: 2 },
  summaryStatDivider: { width: 1, height: 22, backgroundColor: colors.border },

  /* Search Input with Clean Spacing */
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 40,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 12, paddingVertical: 0 },

  /* ─── Published Marks Table (Scrollable & Un-cluttered) ─── */
  tableCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  tableInnerScrollContent: {
    minWidth: 640,
    paddingHorizontal: 12,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginHorizontal: -12,
  },
  tableHeaderCol: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginHorizontal: -12,
  },
  tableRowAlt: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },

  /* Specific Column Dimensions with Generous Breathing Room */
  colExam: {
    width: 145,
    paddingRight: 14,
    paddingLeft: 12,
    justifyContent: "center",
  },
  colStudent: {
    width: 140,
    paddingRight: 14,
    justifyContent: "center",
  },
  colRoll: {
    width: 75,
    paddingRight: 10,
    justifyContent: "center",
  },
  colMarks: {
    width: 95,
    paddingRight: 10,
    justifyContent: "center",
  },
  colGrade: {
    width: 55,
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 10,
  },
  colRemarks: {
    width: 155,
    paddingRight: 12,
    justifyContent: "center",
  },

  /* Cell typography */
  cellExamName: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    lineHeight: 16,
  },
  cellExamSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  cellStudentName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  cellRoll: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  cellMarks: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  cellMaxMarks: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "500",
  },
  gradePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gradePillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  cellRemarksText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 15,
  },
  emptyTableWrap: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTableText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 18,
  },

  /* ─── Web-Style Schedule New Examination Modal ─── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  webStyleModalCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#161622",
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "92%",
  },
  webModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  webModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  webFormGroup: {
    marginBottom: 14,
  },
  webFormRow: {
    flexDirection: "row",
    gap: 12,
  },
  webFormLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  webInput: {
    backgroundColor: "#1f1f30",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f1f30",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  webInputBare: {
    flex: 1,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  webSelectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1f1f30",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  webSelectValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
    paddingRight: 8,
  },
  linkText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "700",
  },

  /* Formatted Exam Slot Highlight Banner */
  formattedSlotBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  formattedSlotLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  formattedSlotTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  formattedSlotValue: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },

  /* Modal Footer Buttons */
  webModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
  },
  webCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: "#252538",
    alignItems: "center",
    justifyContent: "center",
  },
  webCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  webSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  webSaveBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },

  /* Picker Dropdown Menu Card */
  pickerMenuCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#161622",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  filterMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 8,
  },
  filterMenuTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  filterMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  filterMenuItemActive: {
    backgroundColor: colors.primary + "18",
    borderRadius: 6,
  },
  filterMenuItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  filterMenuItemTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  filterMenuItemSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },

  /* Whole-Class Mark Entry Modal (Full Screen) */
  fullModalContainer: { flex: 1, backgroundColor: colors.bgPrimary },
  marksModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  marksModalSuper: { fontSize: 9, fontWeight: "800", color: colors.primary, letterSpacing: 0.5 },
  marksModalTitle: { fontSize: 15, fontWeight: "800", color: colors.textPrimary, marginTop: 1 },
  closeBtn: { padding: 4 },
  marksModalSelectorBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  marksModalSelectorLabel: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  scPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scPillActive: { backgroundColor: colors.primary + "20", borderColor: colors.primary },
  scPillText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  scPillTextActive: { color: colors.primary, fontWeight: "700" },
  marksModalSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    backgroundColor: colors.bgCard,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    height: 36,
  },
  marksModalSearchInput: { flex: 1, color: colors.textPrimary, fontSize: 12, paddingVertical: 0 },
  entryTableHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    marginTop: 4,
  },
  entryHeaderCol: { fontSize: 9, fontWeight: "800", color: colors.textMuted, letterSpacing: 0.5 },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryStudentName: { fontSize: 12, fontWeight: "700", color: colors.textPrimary },
  entryRollText: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  entryMarksInput: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    height: 34,
    paddingHorizontal: 6,
    textAlign: "center",
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  entryRemarkInput: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    height: 34,
    paddingHorizontal: 8,
    color: colors.textPrimary,
    fontSize: 11,
  },
  marksModalBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.lg,
  },
  publishFullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  publishFullBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  /* Delete Modal */
  deleteModalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  deleteModalTitle: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  deleteModalText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginBottom: spacing.md },
  modalActions: { flexDirection: "row", gap: 10, marginTop: spacing.md },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  modalDangerBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
  },
  modalDangerBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});

export default TeacherExamsScreen;
