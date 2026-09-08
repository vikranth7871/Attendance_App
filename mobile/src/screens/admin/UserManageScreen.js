import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  Plus,
  GraduationCap,
  UserCheck,
  Users,
  X,
  SlidersHorizontal,
  Mail,
  Phone,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit2,
  Eye,
  Shield,
  Sparkles,
  Check,
  Layers,
  Building,
  ChevronRight,
  UserPlus,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import Header from '../../components/Header';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import { SkeletonBox } from '../../components/LoadingSkeleton';
import api from '../../api/client';
import { colors, spacing, radius, typography, shadows } from '../../styles/theme';

const ROLE_COLORS = {
  student: colors.student,
  teacher: colors.teacher,
  parent: colors.parent,
  admin: colors.admin,
};

const ROLE_ICONS = {
  student: GraduationCap,
  teacher: UserCheck,
  parent: Users,
  admin: Shield,
};

const DIRECTORY_TABS = [
  { key: 'students', label: 'Students', icon: GraduationCap },
  { key: 'teachers', label: 'Teachers', icon: UserCheck },
  { key: 'parents', label: 'Parents', icon: Users },
];

const SAMPLE_CSV_DATA = {
  student: `name,email,password,role,department,className,section,rollNumber,parentEmail
Alice Johnson,alice.johnson@example.com,student123,student,Computer Science,CS101-A,A,3010,parent.alice@example.com
Bob Smith,bob.smith@example.com,student123,student,Computer Science,CS101-A,A,3011,parent.bob@example.com
Charlie Davis,charlie.davis@example.com,student123,student,Electronics,EC303-A,A,3012,parent.charlie@example.com`,
  teacher: `name,email,password,role,department
Prof Mark Taylor,mark.taylor@example.com,teacher123,teacher,Computer Science
Dr Sarah Wilson,sarah.wilson@example.com,teacher123,teacher,Electronics`,
  parent: `name,email,password,role
Robert Johnson,parent.alice@example.com,parent123,parent
Mary Smith,parent.bob@example.com,parent123,parent`,
};

const UserManageScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('students');
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // FAB Action Sheet
  const [showFabSheet, setShowFabSheet] = useState(false);

  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);

  // Dossier State
  const [dossierUser, setDossierUser] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    departmentId: '',
    classId: '',
    rollNumber: '',
    parentEmail: '',
  });
  const [submittingManual, setSubmittingManual] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    role: 'student',
    departmentId: '',
    classId: '',
    rollNumber: '',
    parentEmail: '',
    password: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Bulk Upload State
  const [bulkRole, setBulkRole] = useState('student');
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const fetchDepartmentsAndClasses = async () => {
    try {
      const [deptRes, classRes] = await Promise.all([
        api.get('/admin/departments').catch(() => ({ data: [] })),
        api.get('/admin/classes').catch(() => ({ data: [] })),
      ]);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
      setClasses(Array.isArray(classRes.data) ? classRes.data : []);
    } catch (err) {
      console.error('Master data fetch error:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let endpoint = '/admin/students';
      if (activeTab === 'teachers') endpoint = '/admin/teachers';
      if (activeTab === 'parents') endpoint = '/admin/parents';

      const params = {};
      if (filterClass) params.classId = filterClass;
      if (filterDept) params.departmentId = filterDept;

      const res = await api.get(endpoint, { params }).catch(() => ({ data: [] }));
      const list = Array.isArray(res.data) ? res.data : (res.data?.students || res.data?.teachers || res.data?.parents || []);

      const roleName = activeTab === 'students' ? 'student' : activeTab === 'teachers' ? 'teacher' : 'parent';
      const normalized = list.map(item => ({
        ...item,
        role: item.role || roleName,
        id: item.id || item._id,
      }));

      setUsers(normalized);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDepartmentsAndClasses();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [activeTab, filterDept, filterClass]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDepartmentsAndClasses();
    fetchUsers();
  }, [activeTab, filterDept, filterClass]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u => {
      const name = (u.name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase();
      const email = (u.email || '').toLowerCase();
      const roll = (u.roll_number || u.rollNumber || '').toLowerCase();
      return name.includes(q) || email.includes(q) || roll.includes(q);
    });
  }, [search, users]);

  // View Dossier
  const handleViewDossier = async (user) => {
    setDossierUser(user);
    setShowDossierModal(true);
    setLoadingDossier(true);
    try {
      const { data } = await api.get(`/admin/user/${user.id || user._id}`);
      setDossierUser(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error('Fetch user dossier error:', err);
    } finally {
      setLoadingDossier(false);
    }
  };

  // Open Edit
  const handleOpenEdit = (user) => {
    setEditForm({
      id: user.id || user._id,
      name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'student',
      departmentId: user.department_id || user.departmentId?._id || user.departmentId || '',
      classId: user.class_id || user.classId?._id || user.classId || '',
      rollNumber: user.roll_number || user.rollNumber || '',
      parentEmail: user.parent_email || user.parentEmail || '',
      password: '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      Alert.alert('Validation Error', 'Full Name and Email are required.');
      return;
    }
    setSavingEdit(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone?.trim() || null,
        department_id: editForm.departmentId || null,
        departmentId: editForm.departmentId || null,
        class_id: editForm.classId || null,
        classId: editForm.classId || null,
        roll_number: editForm.rollNumber?.trim() || null,
        rollNumber: editForm.rollNumber?.trim() || null,
        parent_email: editForm.parentEmail?.trim() || null,
        parentEmail: editForm.parentEmail?.trim() || null,
      };
      if (editForm.password?.trim()) {
        payload.password = editForm.password.trim();
      }
      await api.put(`/admin/update-user/${editForm.id}`, payload);
      setShowEditModal(false);
      Alert.alert('Success', 'User profile updated successfully.');
      fetchUsers();
    } catch (err) {
      Alert.alert('Update Failed', err.response?.data?.message || 'Could not update user.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteUser = (user) => {
    const userName = user.name || user.email;
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/user/${user.id || user._id}`);
              Alert.alert('Deleted', `User ${userName} was deleted.`);
              fetchUsers();
            } catch (err) {
              Alert.alert('Delete Failed', err.response?.data?.message || 'Failed to delete user.');
            }
          },
        },
      ]
    );
  };

  const handleCreateManual = async () => {
    const { name, email, password, role, departmentId, classId, rollNumber, parentEmail } = manualForm;
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Name, Email, and Password are required.');
      return;
    }
    if (role === 'student' && !parentEmail.trim()) {
      Alert.alert('Validation Error', 'Parent Email is required for student registration.');
      return;
    }

    setSubmittingManual(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
        departmentId: departmentId || undefined,
        classId: classId || undefined,
        rollNumber: rollNumber ? rollNumber.trim() : undefined,
        parentEmail: parentEmail ? parentEmail.trim() : undefined,
      };

      await api.post('/admin/create-user', payload);
      setShowManualModal(false);
      setManualForm({
        name: '',
        email: '',
        password: '',
        role: 'student',
        departmentId: '',
        classId: '',
        rollNumber: '',
        parentEmail: '',
      });
      Alert.alert('Success', `${role.toUpperCase()} account created successfully.`);
      fetchUsers();
    } catch (err) {
      Alert.alert('Creation Failed', err.response?.data?.message || 'Could not create user.');
    } finally {
      setSubmittingManual(false);
    }
  };

  const handlePickCsv = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setFileName(file.name);
        const response = await fetch(file.uri);
        const csvText = await response.text();
        parseCsvText(csvText);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to read CSV file: ' + err.message);
    }
  };

  const handleLoadSampleCsv = () => {
    const sample = SAMPLE_CSV_DATA[bulkRole] || SAMPLE_CSV_DATA.student;
    setFileName(`sample_${bulkRole}_template.csv`);
    parseCsvText(sample);
  };

  const parseCsvText = (text) => {
    setBulkResult(null);
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          Alert.alert('Empty CSV', 'No data rows found in the CSV.');
          return;
        }
        setParsedRows(results.data);
      },
      error: (err) => {
        Alert.alert('CSV Parse Error', err.message);
      },
    });
  };

  const handleSubmitBulk = async () => {
    if (parsedRows.length === 0) {
      Alert.alert('No Rows', 'Please pick a CSV file or load sample rows first.');
      return;
    }
    setUploadingBulk(true);
    setBulkResult(null);
    try {
      const { data } = await api.post('/admin/create-users-bulk', { users: parsedRows });
      setBulkResult(data);
      fetchUsers();
    } catch (err) {
      Alert.alert('Bulk Upload Error', err.response?.data?.message || 'Failed to process bulk upload.');
    } finally {
      setUploadingBulk(false);
    }
  };

  const selectedDeptName = useMemo(() => {
    if (!filterDept) return null;
    const d = departments.find(item => item.id?.toString() === filterDept?.toString() || item.name === filterDept);
    return d?.name || filterDept;
  }, [filterDept, departments]);

  const selectedClassName = useMemo(() => {
    if (!filterClass) return null;
    const c = classes.find(item => item.id?.toString() === filterClass?.toString());
    return c?.name || c?.className || filterClass;
  }, [filterClass, classes]);

  const activeFilterCount = (filterDept ? 1 : 0) + (filterClass ? 1 : 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Sleek Top Header */}
      <Header
        title="User Directory"
        subtitle={`${filteredUsers.length} ${activeTab}`}
        navigation={navigation}
      />

      {/* Modern Control Bar: Segment Tabs + Search & Filter */}
      <View style={styles.topControlCard}>
        {/* Segment Tabs */}
        <View style={styles.segmentContainer}>
          {DIRECTORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                onPress={() => {
                  setActiveTab(tab.key);
                  setFilterClass('');
                }}
                activeOpacity={0.7}
              >
                <Icon size={15} color={active ? '#fff' : colors.textMuted} />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Unified Search & Filter Trigger */}
        <View style={styles.searchFilterRow}>
          <View style={styles.searchBar}>
            <Search size={15} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={`Search ${activeTab}...`}
              placeholderTextColor={colors.textMuted}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={15} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Button */}
          <TouchableOpacity
            style={[styles.filterTriggerBtn, activeFilterCount > 0 && styles.filterTriggerBtnActive]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.75}
          >
            <SlidersHorizontal size={15} color={activeFilterCount > 0 ? colors.primary : colors.textMuted} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active Filter Chips (Only shown when a filter is applied) */}
        {activeFilterCount > 0 && (
          <View style={styles.activeChipsRow}>
            {selectedDeptName && (
              <View style={styles.activeChip}>
                <Text style={styles.activeChipText}>Dept: {selectedDeptName}</Text>
                <TouchableOpacity onPress={() => setFilterDept('')}>
                  <X size={12} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            {selectedClassName && (
              <View style={styles.activeChip}>
                <Text style={styles.activeChipText}>Class: {selectedClassName}</Text>
                <TouchableOpacity onPress={() => setFilterClass('')}>
                  <X size={12} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              onPress={() => {
                setFilterDept('');
                setFilterClass('');
              }}
              style={{ marginLeft: 4 }}
            >
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Directory Table Listing (Name, Email, Actions - Centered Headings, 100% Page Compatible) */}
      <View style={styles.tableCard}>
        {/* Table Header Row (Centered Headings) */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Name</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>Email</Text>
          <Text style={[styles.tableHeaderCell, { width: 96, textAlign: 'center' }]}>Actions</Text>
        </View>

        {loading ? (
          /* Matching Table Row Skeletons */
          <View style={styles.tableListContent}>
            {[...Array(9)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.tableRow,
                  i % 2 === 1 && styles.tableRowAlt,
                  { opacity: Math.max(0.25, 0.9 - i * 0.08) },
                ]}
              >
                {/* Name Skeleton */}
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <SkeletonBox width={i % 2 === 0 ? '75%' : '60%'} height={13} style={{ borderRadius: 4 }} />
                </View>

                {/* Email Skeleton */}
                <View style={[styles.tableCell, { flex: 1.2 }]}>
                  <SkeletonBox width={i % 2 === 0 ? '85%' : '70%'} height={11} style={{ borderRadius: 4 }} />
                </View>

                {/* Actions Skeleton (3 square buttons) */}
                <View style={[styles.tableCell, styles.actionButtonsCell, { width: 96 }]}>
                  <SkeletonBox width={27} height={27} style={{ borderRadius: 6 }} />
                  <SkeletonBox width={27} height={27} style={{ borderRadius: 6 }} />
                  <SkeletonBox width={27} height={27} style={{ borderRadius: 6 }} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item, i) => item.id?.toString() || i.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            contentContainerStyle={styles.tableListContent}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Users size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No {activeTab} found</Text>
                <Text style={styles.emptySubtitle}>
                  Try adjusting your search or active filters.
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const displayName = item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'User';

              return (
                <TouchableOpacity
                  style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
                  onPress={() => handleViewDossier(item)}
                  activeOpacity={0.7}
                >
                  {/* Name Column */}
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <Text style={styles.cellTextPrimary} numberOfLines={1} ellipsizeMode="tail">
                      {displayName}
                    </Text>
                  </View>

                  {/* Email Column */}
                  <View style={[styles.tableCell, { flex: 1.2 }]}>
                    <Text style={styles.cellTextSecondary} numberOfLines={1} ellipsizeMode="tail">
                      {item.email || '-'}
                    </Text>
                  </View>

                  {/* Actions Column (View, Edit, Delete) */}
                  <View style={[styles.tableCell, styles.actionButtonsCell, { width: 96 }]}>
                    <TouchableOpacity
                      style={styles.actionBtnView}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleViewDossier(item);
                      }}
                      activeOpacity={0.7}
                      accessibilityLabel="View details"
                    >
                      <Eye size={13} color="#D1D5DB" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnEdit}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(item);
                      }}
                      activeOpacity={0.7}
                      accessibilityLabel="Edit details"
                    >
                      <Edit2 size={13} color="#818CF8" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnDelete}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteUser(item);
                      }}
                      activeOpacity={0.7}
                      accessibilityLabel="Delete user"
                    >
                      <Trash2 size={13} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={[styles.fabBtn, shadows.lg]}
        onPress={() => setShowFabSheet(true)}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {/* ========================================================================= */}
      {/* 1. FAB ACTION SHEET MODAL                                                 */}
      {/* ========================================================================= */}
      <Modal
        visible={showFabSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFabSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFabSheet(false)}
        >
          <View style={styles.actionSheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add & Onboard Users</Text>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setShowFabSheet(false);
                setShowManualModal(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetOptionIconBox, { backgroundColor: colors.primary + '20' }]}>
                <UserPlus size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionHeading}>Manual User Entry</Text>
                <Text style={styles.sheetOptionDesc}>Create a single student, teacher, or parent account</Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setShowFabSheet(false);
                setBulkResult(null);
                setParsedRows([]);
                setFileName('');
                setShowBulkModal(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetOptionIconBox, { backgroundColor: colors.secondary + '20' }]}>
                <Upload size={20} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionHeading}>Bulk CSV Onboarding</Text>
                <Text style={styles.sheetOptionDesc}>Import multiple users at once via CSV spreadsheet</Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* 2. FILTER BOTTOM SHEET MODAL                                              */}
      {/* ========================================================================= */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomFilterSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.filterSheetHeader}>
              <Text style={styles.sheetTitle}>Filter Directory</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <Text style={styles.filterSectionLabel}>Department</Text>
              <View style={styles.filterChipsWrap}>
                <TouchableOpacity
                  style={[styles.filterChip, !filterDept && styles.filterChipActive]}
                  onPress={() => setFilterDept('')}
                >
                  <Text style={[styles.filterChipText, !filterDept && styles.filterChipTextActive]}>
                    All Departments
                  </Text>
                </TouchableOpacity>
                {departments.map((d) => {
                  const idStr = d.id?.toString() || d.name;
                  const isSelected = filterDept === idStr || filterDept === d.name;
                  return (
                    <TouchableOpacity
                      key={d.id || d._id}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                      onPress={() => setFilterDept(isSelected ? '' : idStr)}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {activeTab === 'students' && (
                <>
                  <Text style={styles.filterSectionLabel}>Class</Text>
                  <View style={styles.filterChipsWrap}>
                    <TouchableOpacity
                      style={[styles.filterChip, !filterClass && styles.filterChipActive]}
                      onPress={() => setFilterClass('')}
                    >
                      <Text style={[styles.filterChipText, !filterClass && styles.filterChipTextActive]}>
                        All Classes
                      </Text>
                    </TouchableOpacity>
                    {classes.map((c) => {
                      const idStr = c.id?.toString() || c._id?.toString();
                      const isSelected = filterClass === idStr;
                      return (
                        <TouchableOpacity
                          key={c.id || c._id}
                          style={[styles.filterChip, isSelected && styles.filterChipActive]}
                          onPress={() => setFilterClass(isSelected ? '' : idStr)}
                        >
                          <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                            {c.name || c.className}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.filterActionsRow}>
              <TouchableOpacity
                style={styles.filterResetBtn}
                onPress={() => {
                  setFilterDept('');
                  setFilterClass('');
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.filterResetText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterApplyBtn}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.filterApplyText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 3. USER DOSSIER MODAL                                                     */}
      {/* ========================================================================= */}
      <Modal
        visible={showDossierModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDossierModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalHeading}>User Profile Dossier</Text>
              <TouchableOpacity onPress={() => setShowDossierModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {loadingDossier ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.textMuted, marginTop: 12 }}>Loading dossier...</Text>
              </View>
            ) : dossierUser ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.dossierProfileHeader}>
                  <View
                    style={[
                      styles.dossierAvatar,
                      { backgroundColor: (ROLE_COLORS[dossierUser.role] || colors.primary) + '22' },
                    ]}
                  >
                    {(() => {
                      const Icon = ROLE_ICONS[dossierUser.role] || Users;
                      return <Icon size={32} color={ROLE_COLORS[dossierUser.role] || colors.primary} />;
                    })()}
                  </View>
                  <Text style={styles.dossierName}>{dossierUser.name}</Text>
                  <Text style={styles.dossierEmail}>{dossierUser.email}</Text>
                  <View
                    style={[
                      styles.roleBadge,
                      {
                        backgroundColor: (ROLE_COLORS[dossierUser.role] || colors.primary) + '20',
                        marginTop: 6,
                      },
                    ]}
                  >
                    <Text style={[styles.roleBadgeText, { color: ROLE_COLORS[dossierUser.role] || colors.primary }]}>
                      {dossierUser.role}
                    </Text>
                  </View>
                </View>

                {dossierUser.role === 'student' && (
                  <View style={styles.statsGaugeRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxValue}>
                        {dossierUser.attendanceRate !== undefined
                          ? `${dossierUser.attendanceRate}%`
                          : dossierUser.overallPercentage !== undefined
                          ? `${dossierUser.overallPercentage}%`
                          : '—'}
                      </Text>
                      <Text style={styles.statBoxLabel}>Attendance</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={[styles.statBoxValue, { color: colors.primary }]}>
                        {dossierUser.section || 'A'}
                      </Text>
                      <Text style={styles.statBoxLabel}>Section</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={[styles.statBoxValue, { color: colors.success }]}>
                        {dossierUser.status || 'Active'}
                      </Text>
                      <Text style={styles.statBoxLabel}>Status</Text>
                    </View>
                  </View>
                )}

                <View style={styles.dossierDetailsBlock}>
                  <DossierRow label="User ID" value={dossierUser.id || dossierUser._id} />
                  <DossierRow label="Department" value={dossierUser.department_name || dossierUser.departmentName || '—'} />
                  {dossierUser.class_name && <DossierRow label="Class" value={dossierUser.class_name} />}
                  {dossierUser.roll_number && <DossierRow label="Roll Number" value={dossierUser.roll_number} />}
                  {dossierUser.parent_email && <DossierRow label="Parent Email" value={dossierUser.parent_email} />}
                  {dossierUser.phone && <DossierRow label="Phone" value={dossierUser.phone} />}
                </View>

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={[styles.modalActionSecondaryBtn, { borderColor: colors.primary }]}
                    onPress={() => {
                      setShowDossierModal(false);
                      handleOpenEdit(dossierUser);
                    }}
                  >
                    <Edit2 size={14} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Edit Profile</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalActionSecondaryBtn, { borderColor: colors.danger }]}
                    onPress={() => {
                      setShowDossierModal(false);
                      handleDeleteUser(dossierUser);
                    }}
                  >
                    <Trash2 size={14} color={colors.danger} />
                    <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>Delete User</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 4. MANUAL ENTRY MODAL                                                     */}
      {/* ========================================================================= */}
      <Modal
        visible={showManualModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManualModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Plus size={20} color={colors.primary} />
                <Text style={styles.modalHeading}>Create New User</Text>
              </View>
              <TouchableOpacity onPress={() => setShowManualModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.formFieldLabel}>Account Role</Text>
              <View style={styles.rolePickerRow}>
                {['student', 'teacher', 'parent', 'admin'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleOptionBtn,
                      manualForm.role === r && { backgroundColor: colors.primary + '25', borderColor: colors.primary },
                    ]}
                    onPress={() => setManualForm(f => ({ ...f, role: r }))}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        manualForm.role === r && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {r.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formFieldLabel}>Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={manualForm.name}
                onChangeText={v => setManualForm(f => ({ ...f, name: v }))}
                placeholder="e.g. John Doe"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.formFieldLabel}>Email Address *</Text>
              <TextInput
                style={styles.modalInput}
                value={manualForm.email}
                onChangeText={v => setManualForm(f => ({ ...f, email: v }))}
                placeholder="e.g. john@school.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.formFieldLabel}>Initial Password *</Text>
              <TextInput
                style={styles.modalInput}
                value={manualForm.password}
                onChangeText={v => setManualForm(f => ({ ...f, password: v }))}
                placeholder="Temporary or initial password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />

              {(manualForm.role === 'student' || manualForm.role === 'teacher') && (
                <>
                  <Text style={styles.formFieldLabel}>Department</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {departments.map((d) => {
                        const selected = manualForm.departmentId === (d.id?.toString() || d._id?.toString());
                        return (
                          <TouchableOpacity
                            key={d.id || d._id}
                            style={[styles.miniChip, selected && styles.miniChipActive]}
                            onPress={() =>
                              setManualForm(f => ({
                                ...f,
                                departmentId: selected ? '' : (d.id?.toString() || d._id?.toString()),
                              }))
                            }
                          >
                            <Text style={[styles.miniChipText, selected && styles.miniChipTextActive]}>
                              {d.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </>
              )}

              {manualForm.role === 'student' && (
                <>
                  <Text style={styles.formFieldLabel}>Class</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {classes.map((c) => {
                        const selected = manualForm.classId === (c.id?.toString() || c._id?.toString());
                        return (
                          <TouchableOpacity
                            key={c.id || c._id}
                            style={[styles.miniChip, selected && styles.miniChipActive]}
                            onPress={() =>
                              setManualForm(f => ({
                                ...f,
                                classId: selected ? '' : (c.id?.toString() || c._id?.toString()),
                              }))
                            }
                          >
                            <Text style={[styles.miniChipText, selected && styles.miniChipTextActive]}>
                              {c.name || c.className}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  <Text style={styles.formFieldLabel}>Roll Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={manualForm.rollNumber}
                    onChangeText={v => setManualForm(f => ({ ...f, rollNumber: v }))}
                    placeholder="e.g. 3015"
                    placeholderTextColor={colors.textMuted}
                  />

                  <Text style={styles.formFieldLabel}>Parent Email Address *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={manualForm.parentEmail}
                    onChangeText={v => setManualForm(f => ({ ...f, parentEmail: v }))}
                    placeholder="e.g. parent.doe@example.com"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </>
              )}

              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowManualModal(false)}>
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleCreateManual}
                  disabled={submittingManual}
                >
                  {submittingManual ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Create Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 5. BULK CSV UPLOAD MODAL                                                  */}
      {/* ========================================================================= */}
      <Modal
        visible={showBulkModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBulkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FileText size={20} color={colors.primary} />
                <Text style={styles.modalHeading}>Bulk CSV Onboarding</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBulkModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.formFieldLabel}>Target Role Template</Text>
              <View style={styles.rolePickerRow}>
                {['student', 'teacher', 'parent'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleOptionBtn,
                      bulkRole === r && { backgroundColor: colors.primary + '25', borderColor: colors.primary },
                    ]}
                    onPress={() => {
                      setBulkRole(r);
                      setParsedRows([]);
                      setFileName('');
                      setBulkResult(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        bulkRole === r && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {r.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.uploadButtonsBox}>
                <TouchableOpacity style={styles.pickFileBtn} onPress={handlePickCsv} activeOpacity={0.8}>
                  <Upload size={16} color="#fff" />
                  <Text style={styles.pickFileBtnText}>
                    {fileName ? `File: ${fileName}` : 'Pick CSV File from Device'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.sampleDataBtn} onPress={handleLoadSampleCsv} activeOpacity={0.8}>
                  <Sparkles size={15} color={colors.secondary} />
                  <Text style={styles.sampleDataBtnText}>Load Sample {bulkRole} Template</Text>
                </TouchableOpacity>
              </View>

              {parsedRows.length > 0 && (
                <View style={styles.previewContainer}>
                  <View style={styles.previewHeaderRow}>
                    <Text style={styles.previewTitle}>
                      Preview ({parsedRows.length} users parsed)
                    </Text>
                    <TouchableOpacity onPress={() => setParsedRows([])}>
                      <Text style={{ color: colors.danger, fontSize: 12 }}>Clear</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
                    <View>
                      <View style={styles.tableHeaderRow}>
                        <Text style={[styles.th, { width: 130 }]}>Name</Text>
                        <Text style={[styles.th, { width: 170 }]}>Email</Text>
                        <Text style={[styles.th, { width: 80 }]}>Role</Text>
                        <Text style={[styles.th, { width: 120 }]}>Department</Text>
                        <Text style={[styles.th, { width: 90 }]}>Class</Text>
                        <Text style={[styles.th, { width: 70 }]}>Roll</Text>
                        <Text style={[styles.th, { width: 170 }]}>Parent Email</Text>
                      </View>

                      {parsedRows.slice(0, 15).map((row, idx) => (
                        <View key={idx} style={[styles.tableDataRow, idx % 2 === 1 && styles.tableRowAlt]}>
                          <Text style={[styles.td, { width: 130 }]} numberOfLines={1}>{row.name || '—'}</Text>
                          <Text style={[styles.td, { width: 170 }]} numberOfLines={1}>{row.email || '—'}</Text>
                          <Text style={[styles.td, { width: 80 }]} numberOfLines={1}>{row.role || bulkRole}</Text>
                          <Text style={[styles.td, { width: 120 }]} numberOfLines={1}>{row.department || '—'}</Text>
                          <Text style={[styles.td, { width: 90 }]} numberOfLines={1}>{row.className || '—'}</Text>
                          <Text style={[styles.td, { width: 70 }]} numberOfLines={1}>{row.rollNumber || '—'}</Text>
                          <Text style={[styles.td, { width: 170 }]} numberOfLines={1}>{row.parentEmail || '—'}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                  {parsedRows.length > 15 && (
                    <Text style={styles.moreRowsText}>
                      + {parsedRows.length - 15} more rows will be imported
                    </Text>
                  )}
                </View>
              )}

              {bulkResult && (
                <View style={styles.resultCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <CheckCircle size={18} color={colors.success} />
                    <Text style={styles.resultTitle}>Bulk Import Completed</Text>
                  </View>
                  <Text style={styles.resultItem}>
                    ✅ <Text style={{ fontWeight: '700', color: colors.success }}>{bulkResult.successful?.length || 0}</Text> users registered
                  </Text>
                  {bulkResult.skipped?.length > 0 && (
                    <Text style={styles.resultItem}>
                      ⚠️ <Text style={{ fontWeight: '700', color: colors.warning }}>{bulkResult.skipped.length}</Text> skipped (duplicates)
                    </Text>
                  )}
                  {bulkResult.failed?.length > 0 && (
                    <View style={{ marginTop: 6 }}>
                      <Text style={[styles.resultItem, { color: colors.danger, fontWeight: '700' }]}>
                        ❌ {bulkResult.failed.length} failed:
                      </Text>
                      {bulkResult.failed.map((err, i) => (
                        <Text key={i} style={styles.failedRowText}>• {err}</Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowBulkModal(false)}>
                  <Text style={styles.modalCancelBtnText}>Close</Text>
                </TouchableOpacity>

                {parsedRows.length > 0 && (
                  <TouchableOpacity
                    style={styles.modalSubmitBtn}
                    onPress={handleSubmitBulk}
                    disabled={uploadingBulk}
                  >
                    {uploadingBulk ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.modalSubmitBtnText}>
                        Upload {parsedRows.length} Users
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 6. EDIT USER MODAL                                                        */}
      {/* ========================================================================= */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Edit2 size={20} color={colors.secondary} />
                <Text style={styles.modalHeading}>Edit User Profile</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.formFieldLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.name}
                onChangeText={v => setEditForm(f => ({ ...f, name: v }))}
                placeholder="Full Name"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.formFieldLabel}>Email</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.email}
                onChangeText={v => setEditForm(f => ({ ...f, email: v }))}
                placeholder="Email Address"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <Text style={styles.formFieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.phone}
                onChangeText={v => setEditForm(f => ({ ...f, phone: v }))}
                placeholder="Phone Number"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.formFieldLabel}>Department</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {departments.map((d) => {
                    const selected = editForm.departmentId?.toString() === (d.id?.toString() || d._id?.toString());
                    return (
                      <TouchableOpacity
                        key={d.id || d._id}
                        style={[styles.miniChip, selected && styles.miniChipActive]}
                        onPress={() =>
                          setEditForm(f => ({
                            ...f,
                            departmentId: selected ? '' : (d.id?.toString() || d._id?.toString()),
                          }))
                        }
                      >
                        <Text style={[styles.miniChipText, selected && styles.miniChipTextActive]}>
                          {d.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {editForm.role === 'student' && (
                <>
                  <Text style={styles.formFieldLabel}>Class</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {classes.map((c) => {
                        const selected = editForm.classId?.toString() === (c.id?.toString() || c._id?.toString());
                        return (
                          <TouchableOpacity
                            key={c.id || c._id}
                            style={[styles.miniChip, selected && styles.miniChipActive]}
                            onPress={() =>
                              setEditForm(f => ({
                                ...f,
                                classId: selected ? '' : (c.id?.toString() || c._id?.toString()),
                              }))
                            }
                          >
                            <Text style={[styles.miniChipText, selected && styles.miniChipTextActive]}>
                              {c.name || c.className}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  <Text style={styles.formFieldLabel}>Roll Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editForm.rollNumber}
                    onChangeText={v => setEditForm(f => ({ ...f, rollNumber: v }))}
                    placeholder="Roll Number"
                    placeholderTextColor={colors.textMuted}
                  />

                  <Text style={styles.formFieldLabel}>Parent Email</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editForm.parentEmail}
                    onChangeText={v => setEditForm(f => ({ ...f, parentEmail: v }))}
                    placeholder="Parent Email"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                  />
                </>
              )}

              <Text style={styles.formFieldLabel}>Reset Password (leave blank to keep current)</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.password}
                onChangeText={v => setEditForm(f => ({ ...f, password: v }))}
                placeholder="New Password (optional)"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />

              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditModal(false)}>
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleSaveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const DossierRow = ({ label, value }) => (
  <View style={styles.dossierRow}>
    <Text style={styles.dossierRowLabel}>{label}</Text>
    <Text style={styles.dossierRowValue} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  // Compact Top Controls
  topControlCard: {
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    ...typography.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Search & Filter Row
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    padding: 0,
  },
  filterTriggerBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTriggerBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '18',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },

  // Active Filter Chips
  activeChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  clearAllText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },

  // List
  listContent: {
    padding: spacing.md,
    paddingBottom: 90, // Leave room for FAB
  },

  // Streamlined User Card (High Density)
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userMainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  rollTag: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rollTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  tagText: {
    fontSize: 11,
    color: colors.textMuted,
    maxWidth: 140,
  },
  tagDivider: {
    fontSize: 10,
    color: colors.textMuted,
  },

  // Table Container (100% Page Compatible, fits cleanly within mobile screen)
  // Table Container (Square Corners, 100% Page Compatible, fits cleanly within mobile screen)
  // Table Container (Edge-to-edge, fills background, no side bezels)
  tableCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 0,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.bgElevated,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderTopWidth: 1,
    borderTopColor: colors.border + '60',
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tableListContent: {
    paddingBottom: 80,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
  },
  tableCell: {
    justifyContent: 'center',
    paddingRight: 6,
  },
  cellTextPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cellTextSecondary: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cellTextRegular: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionButtonsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionBtnView: {
    width: 27,
    height: 27,
    borderRadius: 6,
    backgroundColor: '#232733',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnEdit: {
    width: 27,
    height: 27,
    borderRadius: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDelete: {
    width: 27,
    height: 27,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Floating Action Button (FAB)
  fabBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Action Sheet Modal
  actionSheetCard: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  sheetOptionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionHeading: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  sheetOptionDesc: {
    ...typography.xs,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Filter Bottom Sheet
  bottomFilterSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  filterSectionLabel: {
    ...typography.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  filterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  filterActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  filterResetBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterResetText: {
    ...typography.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterApplyBtn: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  filterApplyText: {
    ...typography.sm,
    color: '#fff',
    fontWeight: '700',
  },

  // Empty State
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.base,
    ...typography.bold,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    ...typography.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Modal Common
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCardLarge: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeading: {
    ...typography.lg,
    ...typography.bold,
    color: colors.textPrimary,
  },
  formFieldLabel: {
    ...typography.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  modalInput: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    ...typography.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginBottom: 6,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelBtnText: {
    ...typography.sm,
    ...typography.semibold,
    color: colors.textSecondary,
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    ...typography.sm,
    ...typography.bold,
    color: '#fff',
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  roleOptionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  roleOptionText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  miniChipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  miniChipText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  miniChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Bulk Upload Specific
  uploadButtonsBox: {
    gap: 8,
    marginVertical: 10,
  },
  pickFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  pickFileBtnText: {
    ...typography.sm,
    ...typography.bold,
    color: '#fff',
  },
  sampleDataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.secondary + '18',
    borderColor: colors.secondary + '40',
    borderWidth: 1,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  sampleDataBtnText: {
    ...typography.xs,
    ...typography.semibold,
    color: colors.secondary,
  },
  previewContainer: {
    marginTop: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewTitle: {
    ...typography.xs,
    ...typography.bold,
    color: colors.textPrimary,
  },
  tableScroll: {
    maxHeight: 180,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  th: {
    ...typography.xs,
    fontWeight: '700',
    color: colors.textMuted,
    paddingHorizontal: 6,
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  tableRowAlt: {
    backgroundColor: colors.bgCard + '50',
  },
  td: {
    ...typography.xs,
    color: colors.textPrimary,
    paddingHorizontal: 6,
  },
  moreRowsText: {
    ...typography.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 6,
    textAlign: 'center',
  },
  resultCard: {
    marginTop: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultTitle: {
    ...typography.sm,
    ...typography.bold,
    color: colors.textPrimary,
  },
  resultItem: {
    ...typography.xs,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  failedRowText: {
    ...typography.xs,
    color: colors.danger,
    marginLeft: 10,
    marginTop: 2,
  },

  // Dossier Modal
  dossierProfileHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dossierAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dossierName: {
    ...typography.lg,
    ...typography.bold,
    color: colors.textPrimary,
  },
  dossierEmail: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statsGaugeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBoxValue: {
    ...typography.lg,
    ...typography.bold,
    color: colors.primary,
  },
  statBoxLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  dossierDetailsBlock: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 6,
  },
  dossierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  dossierRowLabel: {
    ...typography.xs,
    color: colors.textMuted,
  },
  dossierRowValue: {
    ...typography.xs,
    ...typography.semibold,
    color: colors.textPrimary,
  },
  modalActionSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.bgElevated,
  },
});

export default UserManageScreen;
