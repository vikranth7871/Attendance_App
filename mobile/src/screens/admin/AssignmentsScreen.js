import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen,
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Trash2,
  Search,
  CheckCircle,
  AlertTriangle,
  X,
  Plus,
  Shield,
  Layers,
} from 'lucide-react-native';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMES = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
];

const AssignmentsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('timetable'); // 'timetable' | 'coordinators'

  // Master Data
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Timetable Form
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [roomNumber, setRoomNumber] = useState('101');
  const [activeDay, setActiveDay] = useState('Monday');
  const [selectedSlots, setSelectedSlots] = useState([]); // [{ dayOfWeek, timeSlot, startTime, endTime }]

  // Coordinator Form
  const [coordDept, setCoordDept] = useState('');
  const [coordClass, setCoordClass] = useState('');
  const [coordTeacher, setCoordTeacher] = useState('');
  const [coordClasses, setCoordClasses] = useState([]);

  // Coordinator Directory Filters
  const [coordSearch, setCoordSearch] = useState('');
  const [coordFilterDept, setCoordFilterDept] = useState('');

  // Picker modal helpers
  const [pickerModal, setPickerModal] = useState({
    visible: false,
    title: '',
    items: [],
    selectedKey: '',
    onSelect: null,
  });

  const fetchData = async () => {
    try {
      const [deptRes, teacherRes, subjRes, coordRes] = await Promise.all([
        api.get('/admin/departments'),
        api.get('/admin/teachers'),
        api.get('/admin/subjects'),
        api.get('/admin/coordinators'),
      ]);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
      setTeachers(Array.isArray(teacherRes.data) ? teacherRes.data : []);
      setSubjects(Array.isArray(subjRes.data) ? subjRes.data : []);
      setCoordinators(Array.isArray(coordRes.data) ? coordRes.data : []);
    } catch (err) {
      console.error('Assignments load error:', err);
      Alert.alert('Error', 'Failed to load allocation data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  // Fetch classes for Timetable tab when department changes
  useEffect(() => {
    if (!selectedDept) {
      setClasses([]);
      setSelectedClass('');
      return;
    }
    const fetchClasses = async () => {
      try {
        const res = await api.get(`/admin/classes?departmentId=${selectedDept}`);
        const list = Array.isArray(res.data) ? res.data : [];
        setClasses(list);
        if (list.length > 0 && !list.some((c) => String(c.id || c._id) === String(selectedClass))) {
          setSelectedClass(String(list[0].id || list[0]._id));
        }
      } catch (e) {
        console.error('Error fetching classes:', e);
      }
    };
    fetchClasses();
  }, [selectedDept]);

  // Fetch classes for Coordinator tab when coordinator department changes
  useEffect(() => {
    if (!coordDept) {
      setCoordClasses([]);
      setCoordClass('');
      return;
    }
    const fetchCoordClasses = async () => {
      try {
        const res = await api.get(`/admin/classes?departmentId=${coordDept}`);
        const list = Array.isArray(res.data) ? res.data : [];
        setCoordClasses(list);
        if (list.length > 0 && !list.some((c) => String(c.id || c._id) === String(coordClass))) {
          setCoordClass(String(list[0].id || list[0]._id));
        }
      } catch (e) {
        console.error('Error fetching coordinator classes:', e);
      }
    };
    fetchCoordClasses();
  }, [coordDept]);

  // Fetch conflicts when class or teacher changes in Timetable tab
  useEffect(() => {
    if (!selectedClass && !selectedTeacher) {
      setBookedSlots([]);
      return;
    }
    const fetchConflicts = async () => {
      try {
        const res = await api.get(
          `/admin/timetable-conflicts?classId=${selectedClass || ''}&teacherId=${selectedTeacher || ''}`
        );
        setBookedSlots(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error('Error fetching conflicts:', e);
        setBookedSlots([]);
      }
    };
    fetchConflicts();
  }, [selectedClass, selectedTeacher]);

  const getSlotConflict = (day, time) => {
    if (!bookedSlots.length) return null;
    const match = bookedSlots.find((alloc) => {
      const matchDay = (alloc.day_of_week || '').toLowerCase().trim() === day.toLowerCase().trim();
      if (!matchDay) return false;

      const targetTime = time.trim().toLowerCase();
      const allocTime = (alloc.time_slot || '').trim().toLowerCase();
      const allocStart = (alloc.start_time || '').trim().toLowerCase();
      const allocEnd = (alloc.end_time || '').trim().toLowerCase();

      if (allocTime && allocTime === targetTime) return true;
      if (allocStart && allocEnd && `${allocStart} - ${allocEnd}` === targetTime) return true;
      if (allocStart && targetTime.split('-')[0].trim() === allocStart) return true;
      return false;
    });

    if (!match) return null;

    const isClassConflict = String(match.class_id) === String(selectedClass);
    const isTeacherConflict = String(match.teacher_id) === String(selectedTeacher);

    let conflictType = 'class';
    if (isClassConflict && isTeacherConflict) conflictType = 'both';
    else if (isTeacherConflict) conflictType = 'teacher';

    return { ...match, conflictType };
  };

  const isSlotSelected = (day, time) => {
    return selectedSlots.some((s) => s.dayOfWeek === day && s.timeSlot === time);
  };

  const toggleSlot = (day, time) => {
    const conflict = getSlotConflict(day, time);
    if (conflict) {
      let desc = '';
      if (conflict.conflictType === 'class') {
        desc = `Class is already occupied: ${conflict.subject_name || 'Subject'} (${conflict.teacher_name || 'Faculty'}).`;
      } else if (conflict.conflictType === 'teacher') {
        desc = `Faculty conflict: ${conflict.teacher_name || 'Faculty'} is already teaching ${conflict.subject_name || 'Subject'} for ${conflict.class_name || 'another class'}.`;
      } else {
        desc = `Already allocated for ${day} ${time}.`;
      }
      Alert.alert('Slot Conflict', desc);
      return;
    }

    const parts = time.split(' - ');
    const startTime = parts[0];
    const endTime = parts[1] || '';

    setSelectedSlots((prev) => {
      const exists = prev.some((s) => s.dayOfWeek === day && s.timeSlot === time);
      if (exists) {
        return prev.filter((s) => !(s.dayOfWeek === day && s.timeSlot === time));
      } else {
        return [...prev, { dayOfWeek: day, timeSlot: time, startTime, endTime }];
      }
    });
  };

  const toggleAllForDay = () => {
    const daySlots = TIMES.filter((t) => !getSlotConflict(activeDay, t));
    const allSelected = daySlots.every((t) => isSlotSelected(activeDay, t));

    setSelectedSlots((prev) => {
      if (allSelected) {
        return prev.filter((s) => s.dayOfWeek !== activeDay);
      } else {
        const withoutDay = prev.filter((s) => s.dayOfWeek !== activeDay);
        const added = daySlots.map((t) => {
          const parts = t.split(' - ');
          return { dayOfWeek: activeDay, timeSlot: t, startTime: parts[0], endTime: parts[1] || '' };
        });
        return [...withoutDay, ...added];
      }
    });
  };

  const handleSaveTimetable = async () => {
    if (!selectedDept || !selectedClass || !selectedSubject || !selectedTeacher) {
      Alert.alert('Missing Fields', 'Please select Department, Class, Subject, and Faculty.');
      return;
    }
    if (selectedSlots.length === 0) {
      Alert.alert('No Slots Selected', 'Please select at least one schedule slot.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/admin/assign-subject', {
        departmentId: selectedDept,
        classId: selectedClass,
        subjectId: selectedSubject,
        teacherId: selectedTeacher,
        roomNumber: roomNumber.trim() || '101',
        slots: selectedSlots,
      });

      Alert.alert('Success', `Allocated subject to ${selectedSlots.length} schedule slot(s) successfully!`);
      setSelectedSlots([]);
      setSelectedSubject('');
      setSelectedTeacher('');

      // Refresh conflict state
      if (selectedClass || selectedTeacher) {
        const res = await api.get(
          `/admin/timetable-conflicts?classId=${selectedClass || ''}&teacherId=${selectedTeacher || ''}`
        );
        setBookedSlots(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      Alert.alert('Allocation Failed', err.response?.data?.message || 'Could not assign subject.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignCoordinator = async () => {
    if (!coordDept || !coordClass || !coordTeacher) {
      Alert.alert('Missing Fields', 'Please select Department, Class, and Faculty Member.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/admin/assign-class-coordinator', {
        departmentId: coordDept,
        classId: coordClass,
        teacherId: coordTeacher,
      });

      Alert.alert('Success', 'Class Coordinator appointed successfully!');
      setCoordTeacher('');
      // Refresh coordinators
      const res = await api.get('/admin/coordinators');
      setCoordinators(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      Alert.alert('Appointment Failed', err.response?.data?.message || 'Could not assign coordinator.');
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeCoordinator = (coord) => {
    Alert.alert(
      'Revoke Coordinator',
      `Are you sure you want to revoke ${coord.teacher_name} as Class Coordinator for ${coord.class_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/admin/revoke-class-coordinator', {
                teacherId: coord.teacher_id || coord.teacherId,
              });
              Alert.alert('Revoked', 'Class coordinator revoked successfully.');
              const res = await api.get('/admin/coordinators');
              setCoordinators(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
              Alert.alert('Revoke Failed', err.response?.data?.message || 'Could not revoke coordinator.');
            }
          },
        },
      ]
    );
  };

  const openPicker = (title, items, selectedKey, onSelect) => {
    setPickerModal({
      visible: true,
      title,
      items,
      selectedKey: String(selectedKey || ''),
      onSelect,
    });
  };

  const filteredCoordinators = coordinators.filter((c) => {
    const matchesSearch =
      !coordSearch ||
      (c.teacher_name || '').toLowerCase().includes(coordSearch.toLowerCase()) ||
      (c.teacher_email || '').toLowerCase().includes(coordSearch.toLowerCase()) ||
      (c.class_name || '').toLowerCase().includes(coordSearch.toLowerCase());
    const matchesDept =
      !coordFilterDept || String(c.department_id || c.departmentId) === String(coordFilterDept);
    return matchesSearch && matchesDept;
  });

  const getDeptName = (id) => {
    const d = departments.find((item) => String(item.id || item._id) === String(id));
    return d ? d.name || d.departmentName : 'Select Department';
  };

  const getClassName = (id, list = classes) => {
    const c = list.find((item) => String(item.id || item._id) === String(id));
    return c ? `${c.name || c.className || 'Class'} (${c.section || 'Sec A'})` : 'Select Class';
  };

  const getSubjName = (id) => {
    const s = subjects.find((item) => String(item.id || item._id) === String(id));
    return s ? `${s.name || s.subjectName} (${s.code || ''})` : 'Select Subject';
  };

  const getTeacherName = (id) => {
    const t = teachers.find((item) => String(item.id || item._id) === String(id));
    return t ? `${t.name} (${t.email})` : 'Select Faculty';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Academic Allocations" subtitle="Timetable & Coordinators" navigation={navigation} />
        <View style={{ padding: spacing.md }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Academic Allocations" subtitle="Timetable & Coordinators" navigation={navigation} />

      {/* Main Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'timetable' && styles.tabButtonActive]}
          onPress={() => setActiveTab('timetable')}
        >
          <Calendar size={16} color={activeTab === 'timetable' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'timetable' && styles.tabTextActive]}>
            Timetable Matrix
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'coordinators' && styles.tabButtonActive]}
          onPress={() => setActiveTab('coordinators')}
        >
          <UserCheck size={16} color={activeTab === 'coordinators' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'coordinators' && styles.tabTextActive]}>
            Class Coordinators
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {activeTab === 'timetable' ? (
          <View style={styles.sectionContainer}>
            {/* Allocation Form Card */}
            <View style={[styles.card, shadows.sm]}>
              <View style={styles.cardHeader}>
                <BookOpen size={18} color={colors.primary} />
                <Text style={styles.cardTitle}>Configure Allocation Target</Text>
              </View>

              {/* Department Selector */}
              <Text style={styles.fieldLabel}>Department</Text>
              <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() =>
                  openPicker(
                    'Select Department',
                    departments.map((d) => ({ key: String(d.id || d._id), label: d.name || d.departmentName })),
                    selectedDept,
                    (key) => setSelectedDept(key)
                  )
                }
              >
                <Building2 size={16} color={colors.textMuted} />
                <Text style={selectedDept ? styles.selectorValueText : styles.selectorPlaceholderText}>
                  {getDeptName(selectedDept)}
                </Text>
              </TouchableOpacity>

              {/* Class Selector */}
              <Text style={styles.fieldLabel}>Class & Section</Text>
              <TouchableOpacity
                style={[styles.selectorBtn, !selectedDept && styles.selectorDisabled]}
                disabled={!selectedDept}
                onPress={() =>
                  openPicker(
                    'Select Class',
                    classes.map((c) => ({
                      key: String(c.id || c._id),
                      label: `${c.name || c.className} (${c.section || 'A'})`,
                    })),
                    selectedClass,
                    (key) => setSelectedClass(key)
                  )
                }
              >
                <Layers size={16} color={colors.textMuted} />
                <Text style={selectedClass ? styles.selectorValueText : styles.selectorPlaceholderText}>
                  {selectedDept ? getClassName(selectedClass) : 'Select a department first'}
                </Text>
              </TouchableOpacity>

              {/* Subject Selector */}
              <Text style={styles.fieldLabel}>Subject Course</Text>
              <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() =>
                  openPicker(
                    'Select Subject',
                    subjects.map((s) => ({
                      key: String(s.id || s._id),
                      label: `${s.name || s.subjectName} (${s.code || ''})`,
                    })),
                    selectedSubject,
                    (key) => setSelectedSubject(key)
                  )
                }
              >
                <BookOpen size={16} color={colors.textMuted} />
                <Text style={selectedSubject ? styles.selectorValueText : styles.selectorPlaceholderText}>
                  {getSubjName(selectedSubject)}
                </Text>
              </TouchableOpacity>

              {/* Faculty Selector */}
              <Text style={styles.fieldLabel}>Assigned Faculty</Text>
              <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() =>
                  openPicker(
                    'Select Faculty Member',
                    teachers.map((t) => ({ key: String(t.id || t._id), label: `${t.name} • ${t.email}` })),
                    selectedTeacher,
                    (key) => setSelectedTeacher(key)
                  )
                }
              >
                <UserCheck size={16} color={colors.textMuted} />
                <Text style={selectedTeacher ? styles.selectorValueText : styles.selectorPlaceholderText}>
                  {getTeacherName(selectedTeacher)}
                </Text>
              </TouchableOpacity>

              {/* Room Number */}
              <Text style={styles.fieldLabel}>Room / Lab Number</Text>
              <View style={styles.inputContainer}>
                <MapPin size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Room 304, Lab B"
                  placeholderTextColor={colors.textMuted}
                  value={roomNumber}
                  onChangeText={setRoomNumber}
                />
              </View>
            </View>

            {/* Days Horizontal Bar */}
            <View style={styles.dayTabsWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
                {DAYS.map((day) => {
                  const daySlotsCount = selectedSlots.filter((s) => s.dayOfWeek === day).length;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayPill, activeDay === day && styles.dayPillActive]}
                      onPress={() => setActiveDay(day)}
                    >
                      <Text style={[styles.dayPillText, activeDay === day && styles.dayPillTextActive]}>
                        {day.slice(0, 3)}
                      </Text>
                      {daySlotsCount > 0 && (
                        <View style={styles.dayBadge}>
                          <Text style={styles.dayBadgeText}>{daySlotsCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Slots Grid for Active Day */}
            <View style={[styles.card, shadows.sm]}>
              <View style={styles.slotsCardHeader}>
                <View>
                  <Text style={styles.slotsHeaderTitle}>{activeDay}'s Time Slots</Text>
                  <Text style={styles.slotsHeaderSubtitle}>Tap slots to allocate or inspect conflict</Text>
                </View>
                <TouchableOpacity style={styles.quickDayBtn} onPress={toggleAllForDay}>
                  <Text style={styles.quickDayBtnText}>Select All</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.slotsList}>
                {TIMES.map((time, idx) => {
                  const isSelected = isSlotSelected(activeDay, time);
                  const conflict = getSlotConflict(activeDay, time);

                  let slotBorderColor = colors.border;
                  let slotBg = colors.bgCard;
                  if (isSelected) {
                    slotBorderColor = colors.primary;
                    slotBg = colors.primary + '18';
                  } else if (conflict) {
                    slotBorderColor = conflict.conflictType === 'both' ? '#DC2626' : colors.warning;
                    slotBg = conflict.conflictType === 'both' ? '#DC262615' : colors.warning + '12';
                  }

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.slotItem, { borderColor: slotBorderColor, backgroundColor: slotBg }]}
                      onPress={() => toggleSlot(activeDay, time)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.slotLeft}>
                        <Clock
                          size={16}
                          color={
                            isSelected ? colors.primary : conflict ? colors.warning : colors.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.slotTimeText,
                            isSelected && { color: colors.primary, fontWeight: '700' },
                          ]}
                        >
                          {time}
                        </Text>
                      </View>

                      {isSelected ? (
                        <View style={styles.selectedBadge}>
                          <CheckCircle size={14} color="#fff" />
                          <Text style={styles.selectedBadgeText}>Selected</Text>
                        </View>
                      ) : conflict ? (
                        <View style={styles.conflictBadge}>
                          <AlertTriangle size={12} color={colors.warning} />
                          <Text style={styles.conflictBadgeText} numberOfLines={1}>
                            {conflict.conflictType === 'class'
                              ? 'Class Busy'
                              : conflict.conflictType === 'teacher'
                              ? 'Faculty Busy'
                              : 'Occupied'}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.emptySlotIndicator}>
                          <Text style={styles.emptySlotText}>Available</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.btnDisabled]}
                onPress={handleSaveTimetable}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <CheckCircle size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>
                      Allocate {selectedSlots.length} Schedule Slot(s)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.sectionContainer}>
            {/* Class Coordinator Appointment Card */}
            <View style={[styles.card, shadows.sm]}>
              <View style={styles.cardHeader}>
                <Shield size={18} color={colors.primary} />
                <Text style={styles.cardTitle}>Appoint Class Coordinator</Text>
              </View>

              {/* Coordinator Department */}
              <Text style={styles.fieldLabel}>Department</Text>
              <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() =>
                  openPicker(
                    'Select Department',
                    departments.map((d) => ({ key: String(d.id || d._id), label: d.name || d.departmentName })),
                    coordDept,
                    (key) => setCoordDept(key)
                  )
                }
              >
                <Building2 size={16} color={colors.textMuted} />
                <Text style={coordDept ? styles.selectorValueText : styles.selectorPlaceholderText}>
                  {getDeptName(coordDept)}
                </Text>
              </TouchableOpacity>

              {/* Coordinator Class */}
              <Text style={styles.fieldLabel}>Target Class</Text>
              <TouchableOpacity
                style={[styles.selectorBtn, !coordDept && styles.selectorDisabled]}
                disabled={!coordDept}
                onPress={() =>
                  openPicker(
                    'Select Class',
                    coordClasses.map((c) => ({
                      key: String(c.id || c._id),
                      label: `${c.name || c.className} (${c.section || 'A'})`,
                    })),
                    coordClass,
                    (key) => setCoordClass(key)
                  )
                }
              >
                <Layers size={16} color={colors.textMuted} />
                <Text style={coordClass ? styles.selectorValueText : styles.selectorPlaceholderText}>
                  {coordDept ? getClassName(coordClass, coordClasses) : 'Select department first'}
                </Text>
              </TouchableOpacity>

              {/* Coordinator Faculty */}
              <Text style={styles.fieldLabel}>Faculty Coordinator</Text>
              <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() =>
                  openPicker(
                    'Select Coordinator Faculty',
                    teachers.map((t) => ({ key: String(t.id || t._id), label: `${t.name} • ${t.email}` })),
                    coordTeacher,
                    (key) => setCoordTeacher(key)
                  )
                }
              >
                <UserCheck size={16} color={colors.textMuted} />
                <Text style={coordTeacher ? styles.selectorValueText : styles.selectorPlaceholderText}>
                  {getTeacherName(coordTeacher)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.btnDisabled, { marginTop: spacing.md }]}
                onPress={handleAssignCoordinator}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Plus size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Appoint Coordinator</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Active Coordinators Directory */}
            <View style={styles.directoryHeader}>
              <Text style={styles.sectionTitle}>Active Coordinators ({filteredCoordinators.length})</Text>
            </View>

            {/* Search and Dept Filter */}
            <View style={styles.searchRow}>
              <View style={styles.searchBar}>
                <Search size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search faculty or class..."
                  placeholderTextColor={colors.textMuted}
                  value={coordSearch}
                  onChangeText={setCoordSearch}
                />
                {coordSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setCoordSearch('')}>
                    <X size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Coordinators List */}
            {filteredCoordinators.length === 0 ? (
              <View style={styles.emptyCard}>
                <UserCheck size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Coordinators Found</Text>
                <Text style={styles.emptySub}>Appoint a faculty coordinator using the form above.</Text>
              </View>
            ) : (
              filteredCoordinators.map((c, idx) => (
                <View key={idx} style={[styles.coordCard, shadows.sm]}>
                  <View style={styles.coordAvatar}>
                    <Text style={styles.coordAvatarText}>
                      {(c.teacher_name || 'T').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.coordInfo}>
                    <Text style={styles.coordName}>{c.teacher_name}</Text>
                    <Text style={styles.coordEmail}>{c.teacher_email}</Text>
                    <View style={styles.coordBadgesRow}>
                      <View style={styles.classBadge}>
                        <Text style={styles.classBadgeText}>{c.class_name || 'Assigned Class'}</Text>
                      </View>
                      {c.department_name && (
                        <View style={styles.deptBadge}>
                          <Text style={styles.deptBadgeText}>{c.department_name}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.revokeBtn}
                    onPress={() => handleRevokeCoordinator(c)}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Reusable Item Picker Modal */}
      <Modal visible={pickerModal.visible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerModal.title}</Text>
              <TouchableOpacity
                onPress={() => setPickerModal((prev) => ({ ...prev, visible: false }))}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 350 }}>
              {pickerModal.items.map((item) => {
                const isSelected = item.key === pickerModal.selectedKey;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => {
                      pickerModal.onSelect && pickerModal.onSelect(item.key);
                      setPickerModal((prev) => ({ ...prev, visible: false }));
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        isSelected && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && <CheckCircle size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  content: { padding: spacing.md },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    padding: 4,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.primary + '22',
  },
  tabText: { ...typography.xs, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  sectionContainer: { marginTop: spacing.sm },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: { ...typography.sm, ...typography.bold, color: colors.textPrimary },
  fieldLabel: {
    ...typography.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  selectorDisabled: {
    opacity: 0.5,
  },
  selectorPlaceholderText: {
    ...typography.sm,
    color: colors.textMuted,
    flex: 1,
  },
  selectorValueText: {
    ...typography.sm,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    ...typography.sm,
    color: colors.textPrimary,
    paddingVertical: 8,
  },
  dayTabsWrapper: {
    marginBottom: spacing.md,
  },
  dayTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayPillText: {
    ...typography.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayPillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  dayBadge: {
    backgroundColor: colors.secondary,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  slotsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  slotsHeaderTitle: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  slotsHeaderSubtitle: {
    ...typography.xs,
    color: colors.textMuted,
  },
  quickDayBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickDayBtnText: {
    ...typography.xs,
    color: colors.primary,
    fontWeight: '600',
  },
  slotsList: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  slotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  slotTimeText: {
    ...typography.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  selectedBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  conflictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warning + '25',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  conflictBadgeText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '700',
  },
  emptySlotIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
  },
  emptySlotText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    ...typography.sm,
    ...typography.bold,
    color: '#fff',
  },
  directoryHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  searchRow: {
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.sm,
    color: colors.textPrimary,
  },
  coordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  coordAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary + '22',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '55',
  },
  coordAvatarText: {
    ...typography.base,
    ...typography.bold,
    color: colors.primary,
  },
  coordInfo: {
    flex: 1,
  },
  coordName: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  coordEmail: {
    ...typography.xs,
    color: colors.textMuted,
    marginBottom: 4,
  },
  coordBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  classBadge: {
    backgroundColor: colors.secondary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  classBadgeText: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: '600',
  },
  deptBadge: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  deptBadgeText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  revokeBtn: {
    padding: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.danger + '15',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  emptySub: {
    ...typography.xs,
    color: colors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '55',
  },
  modalItemSelected: {
    backgroundColor: colors.primary + '15',
    borderRadius: radius.sm,
  },
  modalItemText: {
    ...typography.sm,
    color: colors.textSecondary,
    flex: 1,
  },
});

export default AssignmentsScreen;

