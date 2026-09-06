import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FolderOpen,
  FileText,
  BookOpen,
  Image as ImageIcon,
  ExternalLink,
  Plus,
  Trash2,
  Loader2,
  Search,
  Shield,
  User,
  Upload,
  Download,
  Copy,
  FileSpreadsheet,
  Presentation,
  Archive,
  File,
  X,
  Settings,
  PenLine,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { UserGroup } from '@/types/index'
import { fetchGroups } from '@/services/userService'
import {
  fetchDriveResources,
  createDriveResource,
  deleteDriveResource,
  fetchTaskSubmittedDriveFiles,
  uploadSubmissionFile,
  getMasterDriveUrl,
  type DriveResourceWithGroup,
  type SubmittedTaskFileItem,
  type UploadProgressInfo,
} from '@/services/driveService'
import { supabase } from '@/services/supabase'
import { showConfirm, showToast, showError, showPrompt } from '@/utils/sweetalert'
import { getAvatarUrl } from '@/utils/avatarUtils'

const PRESET_CATEGORIES = [
  { id: 'lesson_plan', name: 'แผนการจัดการเรียนรู้' },
  { id: 'pa_report', name: 'รายงานผลการปฏิบัติงาน (PA)' },
  { id: 'research', name: 'วิจัยในชั้นเรียนและนวัตกรรม' },
  { id: 'academic', name: 'เอกสารวัดผลและวิชาการ' },
  { id: 'awards', name: 'เกียรติบัตรและผลงาน' },
  { id: 'forms', name: 'แบบฟอร์มโรงเรียน' },
  { id: 'academic_dept', name: 'ฝ่ายวิชาการ' },
  { id: 'learning_groups', name: 'กลุ่มสาระการเรียนรู้' },
  { id: 'general', name: 'งานทั่วไป' },
]

export const DriveHubPage: React.FC = () => {
  const { user, profile, isAdmin } = useAuth()

  // Tab: 'resources' (School Documents & Templates) vs 'submissions' (Teacher Task Submissions Archive)
  const [activeTab, setActiveTab] = useState<'resources' | 'submissions'>('resources')

  const [resources, setResources] = useState<DriveResourceWithGroup[]>([])
  const [submittedFiles, setSubmittedFiles] = useState<SubmittedTaskFileItem[]>([])
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [masterDriveUrl, setMasterDriveUrl] = useState<string>(
    'https://drive.google.com/drive/folders/1cPV7A4j49UAtOSEZQMKOMAllsm6LDv5i'
  )
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Add Resource Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addMode, setAddMode] = useState<'upload' | 'link'>('upload')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categorySelection, setCategorySelection] = useState<string>('แผนการจัดการเรียนรู้')
  const [customCategoryName, setCustomCategoryName] = useState<string>('')
  const [url, setUrl] = useState('')
  const [targetGroupId, setTargetGroupId] = useState('')
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo | null>(null)

  const [deletedCategories, setDeletedCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('school_deleted_categories')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('school_custom_categories')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [isManageCategoryModalOpen, setIsManageCategoryModalOpen] = useState(false)

  const loadData = useCallback(() => {
    setIsLoading(true)
    Promise.all([
      fetchDriveResources(user?.id, isAdmin, profile?.group_id),
      fetchTaskSubmittedDriveFiles(user?.id, isAdmin),
      fetchGroups(),
      getMasterDriveUrl(),
    ])
      .then(([resData, subFilesData, grpData, driveUrl]) => {
        if (resData.data) setResources(resData.data)
        if (subFilesData.data) setSubmittedFiles(subFilesData.data)
        if (grpData.data) setGroups(grpData.data)
        if (driveUrl) setMasterDriveUrl(driveUrl)
        setIsLoading(false)
      })
      .catch((err) => {
        console.warn('[DriveHubPage] Load data error:', err)
        setIsLoading(false)
      })

    // Load deleted & custom categories from system_settings
    supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['deleted_drive_categories', 'custom_drive_categories'])
      .then((res) => {
        if (res.data) {
          res.data.forEach((row) => {
            if (row.key === 'deleted_drive_categories' && row.value) {
              try {
                const parsed = JSON.parse(row.value)
                if (Array.isArray(parsed)) {
                  setDeletedCategories(parsed)
                  localStorage.setItem('school_deleted_categories', JSON.stringify(parsed))
                }
              } catch {}
            }
            if (row.key === 'custom_drive_categories' && row.value) {
              try {
                const parsed = JSON.parse(row.value)
                if (Array.isArray(parsed)) {
                  setCustomCategories(parsed)
                  localStorage.setItem('school_custom_categories', JSON.stringify(parsed))
                }
              } catch {}
            }
          })
        }
      })
  }, [user?.id, isAdmin, profile?.group_id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Extract all unique categories dynamically
  const allCategories = useMemo(() => {
    const set = new Set<string>()
    PRESET_CATEGORIES.forEach((p) => {
      if (!deletedCategories.includes(p.name)) {
        set.add(p.name)
      }
    })
    customCategories.forEach((c) => {
      if (!deletedCategories.includes(c)) {
        set.add(c)
      }
    })
    resources.forEach((r) => {
      if (r.category && !deletedCategories.includes(r.category)) {
        set.add(r.category)
      }
    })
    submittedFiles.forEach((f) => {
      if (f.task_category && !deletedCategories.includes(f.task_category)) {
        set.add(f.task_category)
      }
    })
    return Array.from(set)
  }, [resources, submittedFiles, deletedCategories, customCategories])

  const handleEditCategory = async (oldName: string) => {
    const newName = await showPrompt(
      'แก้ไขชื่อประเภททรัพยากร',
      'กรุณาระบุชื่อประเภทใหม่',
      oldName,
      'บันทึกชื่อใหม่'
    )
    if (!newName || newName === oldName) return

    const trimmed = newName.trim()
    const { error: updateErr } = await supabase
      .from('drive_resources')
      .update({ category: trimmed })
      .eq('category', oldName)

    if (updateErr) {
      showError('ไม่สามารถแก้ไขชื่อประเภทได้', updateErr.message)
      return
    }

    const isPreset = PRESET_CATEGORIES.some((p) => p.name === oldName)
    let nextDeleted = [...deletedCategories]
    if (isPreset && !deletedCategories.includes(oldName)) {
      nextDeleted = [...deletedCategories, oldName]
      setDeletedCategories(nextDeleted)
      localStorage.setItem('school_deleted_categories', JSON.stringify(nextDeleted))
      await supabase.from('system_settings').upsert({
        key: 'deleted_drive_categories',
        value: JSON.stringify(nextDeleted),
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      })
    }

    let nextCustom = customCategories.filter((c) => c !== oldName)
    if (!nextCustom.includes(trimmed)) {
      nextCustom.push(trimmed)
    }
    setCustomCategories(nextCustom)
    localStorage.setItem('school_custom_categories', JSON.stringify(nextCustom))
    await supabase.from('system_settings').upsert({
      key: 'custom_drive_categories',
      value: JSON.stringify(nextCustom),
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    })

    if (activeCategory === oldName) setActiveCategory(trimmed)
    if (categorySelection === oldName) setCategorySelection(trimmed)

    showToast(`เปลี่ยนชื่อประเภทเป็น "${trimmed}" เรียบร้อยแล้ว`, 'success')
    loadData()
  }

  const handleDeleteCategory = async (catName: string) => {
    const matchingCount = resources.filter((r) => r.category === catName).length
    const confirmed = await showConfirm(
      `ยืนยันการลบประเภท "${catName}"?`,
      matchingCount > 0
        ? `มีทรัพยากรในประเภทนี้ ${matchingCount} รายการ โดยไฟล์จะถูกเปลี่ยนเป็นหมวด "งานทั่วไป" ให้โดยอัตโนมัติ`
        : `ประเภท "${catName}" จะถูกลบออกจากแถบตัวเลือกและระบบ`,
      'ลบประเภท',
      'ยกเลิก',
      true
    )
    if (!confirmed) return

    if (matchingCount > 0) {
      await supabase.from('drive_resources').update({ category: 'งานทั่วไป' }).eq('category', catName)
    }

    const updatedDeleted = Array.from(new Set([...deletedCategories, catName]))
    setDeletedCategories(updatedDeleted)
    localStorage.setItem('school_deleted_categories', JSON.stringify(updatedDeleted))

    const updatedCustom = customCategories.filter((c) => c !== catName)
    setCustomCategories(updatedCustom)
    localStorage.setItem('school_custom_categories', JSON.stringify(updatedCustom))

    await Promise.all([
      supabase.from('system_settings').upsert({
        key: 'deleted_drive_categories',
        value: JSON.stringify(updatedDeleted),
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      }),
      supabase.from('system_settings').upsert({
        key: 'custom_drive_categories',
        value: JSON.stringify(updatedCustom),
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      }),
    ])

    if (activeCategory === catName) setActiveCategory('all')
    if (categorySelection === catName) setCategorySelection(allCategories.find((c) => c !== catName) || 'งานทั่วไป')

    showToast(`ลบประเภท "${catName}" เรียบร้อยแล้ว`, 'success')
    loadData()
  }

  // Filtered lists
  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const matchCategory = activeCategory === 'all' || item.category === activeCategory
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [resources, activeCategory, searchQuery])

  const filteredSubmittedFiles = useMemo(() => {
    return submittedFiles.filter((item) => {
      const matchCategory = activeCategory === 'all' || item.task_category === activeCategory
      const matchSearch =
        item.task_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.subtask_title && item.subtask_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.task_category.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [submittedFiles, activeCategory, searchQuery])

  const handleOpenAddModal = () => {
    setTitle('')
    setDescription('')
    setCategorySelection(allCategories[0] || 'แผนการจัดการเรียนรู้')
    setCustomCategoryName('')
    setUrl('')
    setFileToUpload(null)
    setAddMode('upload')
    setTargetGroupId('')
    setFormError(null)
    setUploadProgress(null)
    setIsAddModalOpen(true)
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0]
      setFileToUpload(f)
      if (!title) {
        setTitle(f.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0]
      setFileToUpload(f)
      if (!title) {
        setTitle(f.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!title.trim()) {
      setFormError('กรุณากรอกชื่อไฟล์หรือทรัพยากร')
      return
    }

    let finalCategory = categorySelection
    if (categorySelection === 'custom') {
      if (!customCategoryName.trim()) {
        setFormError('กรุณาระบุชื่อประเภทใหม่ที่ต้องการเพิ่ม')
        return
      }
      finalCategory = customCategoryName.trim()
      if (!customCategories.includes(finalCategory)) {
        const nextCustom = [...customCategories, finalCategory]
        setCustomCategories(nextCustom)
        localStorage.setItem('school_custom_categories', JSON.stringify(nextCustom))
        supabase
          .from('system_settings')
          .upsert({
            key: 'custom_drive_categories',
            value: JSON.stringify(nextCustom),
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          })
          .then()
      }
    }

    let finalUrl = url.trim()
    let fileSize: number | null = null
    let fileType: string | null = null

    setIsSubmitting(true)
    setUploadProgress(null)

    // Mode A: File Upload via Google Apps Script Web App (Synced directly with Google Drive)
    if (addMode === 'upload') {
      if (!fileToUpload) {
        setIsSubmitting(false)
        setFormError('กรุณาเลือกไฟล์ที่ต้องการอัปโหลดเข้า Google Drive')
        return
      }

      const uploadRes = await uploadSubmissionFile({
        file: fileToUpload,
        category: finalCategory,
        taskTitle: 'คลังทรัพยากรโรงเรียน',
        teacherName: profile?.name || 'แอดมินโรงเรียน',
        subtaskTitle: title.trim(),
        onProgress: (p) => setUploadProgress(p),
      })

      if (!uploadRes.success || !uploadRes.url) {
        setIsSubmitting(false)
        setFormError(uploadRes.error || 'ไม่สามารถอัปโหลดไฟล์เข้าสู่ Google Drive ได้')
        return
      }

      finalUrl = uploadRes.url
      fileSize = fileToUpload.size
      fileType = fileToUpload.name.split('.').pop()?.toLowerCase() || 'file'
    } else {
      // Mode B: Link
      if (!finalUrl) {
        setIsSubmitting(false)
        setFormError('กรุณากรอกลิงก์ Google Drive หรือเอกสารออนไลน์')
        return
      }
      if (finalUrl.includes('drive.google.com')) fileType = 'drive'
      else fileType = 'link'
    }

    const res = await createDriveResource({
      title: title.trim(),
      description: description.trim() || undefined,
      category: finalCategory,
      url: finalUrl,
      group_id: targetGroupId || null,
      created_by: user?.id,
      file_size: fileSize,
      file_type: fileType,
    })

    setIsSubmitting(false)

    if (res.success) {
      setIsAddModalOpen(false)
      showToast(`เพิ่ม "${title}" เข้าสู่ Google Drive และคลังโรงเรียนเรียบร้อยแล้ว 🎉`, 'success')
      loadData()
    } else {
      setFormError(res.error || 'ไม่สามารถเพิ่มทรัพยากรได้')
    }
  }

  const handleDeleteResource = async (item: DriveResourceWithGroup) => {
    if (!isAdmin) {
      showError('ไม่มีสิทธิ์ดำเนินการ', 'การลบทรัพยากรอนุญาตเฉพาะผู้ดูแลระบบ (Admin) เท่านั้น')
      return
    }

    const confirmed = await showConfirm(
      'ยืนยันการลบทรัพยากร?',
      `คุณต้องการลบ "${item.title}" ออกจากคลังใช่หรือไม่?`,
      'ลบออก',
      'ยกเลิก',
      true
    )
    if (!confirmed) return

    const res = await deleteDriveResource(item.id, user?.id)
    if (res.success) {
      showToast(`ลบ "${item.title}" เรียบร้อยแล้ว`, 'success')
      loadData()
    } else {
      showError('ไม่สามารถลบได้', res.error)
    }
  }

  const handleCopyLink = (itemUrl: string) => {
    navigator.clipboard.writeText(itemUrl)
    showToast('คัดลอกลิงก์เรียบร้อยแล้ว', 'success')
  }

  const renderFileBadge = (type?: string | null, fileUrl?: string) => {
    const ext = type?.toLowerCase() || (fileUrl?.includes('drive.google.com') ? 'drive' : 'file')

    if (ext === 'pdf') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold border border-red-200">
          <FileText className="h-3 w-3" /> PDF
        </span>
      )
    }
    if (['doc', 'docx'].includes(ext)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-bold border border-blue-200">
          <FileText className="h-3 w-3" /> DOCX
        </span>
      )
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold border border-emerald-200">
          <FileSpreadsheet className="h-3 w-3" /> XLSX
        </span>
      )
    }
    if (['ppt', 'pptx'].includes(ext)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 text-orange-700 px-2 py-0.5 text-[10px] font-bold border border-orange-200">
          <Presentation className="h-3 w-3" /> PPTX
        </span>
      )
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-bold border border-purple-200">
          <ImageIcon className="h-3 w-3" /> รูปภาพ
        </span>
      )
    }
    if (['zip', 'rar', '7z'].includes(ext)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold border border-amber-200">
          <Archive className="h-3 w-3" /> ZIP
        </span>
      )
    }
    if (ext === 'drive' || fileUrl?.includes('drive.google.com')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold border border-emerald-200">
          <FolderOpen className="h-3 w-3" /> Google Drive
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-bold border border-slate-200">
        <File className="h-3 w-3" /> ไฟล์
      </span>
    )
  }

  const renderCategoryIcon = (cat: string) => {
    if (cat.includes('แผน') || cat.includes('lesson')) return <BookOpen className="h-5 w-5 text-emerald-600" />
    if (cat.includes('รายงาน') || cat.includes('PA')) return <FileText className="h-5 w-5 text-blue-600" />
    if (cat.includes('วิจัย') || cat.includes('นวัตกรรม')) return <Sparkles className="h-5 w-5 text-amber-600" />
    if (cat.includes('วิชาการ')) return <FolderOpen className="h-5 w-5 text-teal-600" />
    if (cat.includes('แบบฟอร์ม')) return <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
    return <FolderOpen className="h-5 w-5 text-emerald-600" />
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isAdmin
                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isAdmin ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
              <span>{isAdmin ? 'โหมดผู้ดูแลระบบ: แสดงคลังโรงเรียนทั้งหมด' : 'คลังทรัพยากรโรงเรียนและผลงาน'}</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <FolderOpen className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600" />
            <span>คลังไฟล์ & ทรัพยากรโรงเรียน (School Drive Hub)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ศูนย์กลางจัดเก็บและเชื่อมโยงเอกสารโรงเรียน แม่แบบ และผลงานภาระงานครูเข้ากับ Google Drive กลาง
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={masterDriveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-all shadow-2xs"
          >
            <FolderOpen className="h-4 w-4 text-emerald-600" />
            <span>เปิด Google Drive กลาง (Flie) ↗</span>
          </a>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่มไฟล์เข้า Google Drive</span>
          </button>
        </div>
      </div>

      {/* Google Drive Central Folder Hierarchy Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/60 p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Google Drive Central Storage Architecture
              </span>
            </div>
            <p className="text-xs text-slate-600">
              โครงสร้างการจัดเก็บไฟล์อัตโนมัติในไดรฟ์กลางของโรงเรียน (Flie):
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono font-medium text-slate-700 mt-1">
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                📁 Flie (โฟลเดอร์หลัก)
              </span>
              <span>➔</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                📁 [หมวดหมู่ / ฝ่ายงาน]
              </span>
              <span>➔</span>
              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                📁 [ชื่องาน / เอกสาร]
              </span>
              <span>➔</span>
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                📁 [ชื่อครูผู้ส่งงาน]
              </span>
              <span>➔</span>
              <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                📄 [ไฟล์ผลงาน]
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
            <span className="text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              ไฟล์ที่ครูส่งในระบบจะถูกส่งเข้า Google Drive นี้โดยอัตโนมัติ 100%
            </span>
          </div>
        </div>
      </div>

      {/* Dual Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'resources'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          <span>📁 คลังเอกสาร & แบบฟอร์มโรงเรียน</span>
          <span
            className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
              activeTab === 'resources' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {resources.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'submissions'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>📥 คลังผลงานที่ครูส่งในภาระงาน (Task Archive)</span>
          <span
            className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
              activeTab === 'submissions' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {submittedFiles.length}
          </span>
        </button>
      </div>

      {/* Search & Dynamic Category Filter */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'resources'
                ? 'ค้นหาไฟล์เอกสาร, แบบฟอร์ม, หรือหมวดหมู่...'
                : 'ค้นหาชื่องาน, ชื่อครูผู้ส่ง, หรือชื่อไฟล์...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none shadow-2xs"
          />
        </div>

        {/* Dynamic Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5 border border-slate-200 rounded-xl p-1 bg-white text-xs shadow-2xs overflow-x-auto">
          <button
            onClick={() => setActiveCategory('all')}
            className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer shrink-0 font-medium ${
              activeCategory === 'all'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ทั้งหมด (
            {activeTab === 'resources' ? resources.length : submittedFiles.length}
            )
          </button>
          {allCategories.map((catName) => {
            const count =
              activeTab === 'resources'
                ? resources.filter((r) => r.category === catName).length
                : submittedFiles.filter((f) => f.task_category === catName).length

            return (
              <button
                key={catName}
                onClick={() => setActiveCategory(catName)}
                className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer shrink-0 font-medium ${
                  activeCategory === catName
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {catName} {count > 0 && `(${count})`}
              </button>
            )
          })}

          {/* Manage Categories Button (Admin only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsManageCategoryModalOpen(true)}
              title="จัดการ / แก้ไข / ลบประเภททรัพยากร"
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors border border-dashed border-slate-300 shrink-0 cursor-pointer ml-1"
            >
              <Settings className="h-3 w-3 text-slate-500" />
              <span>จัดการประเภท</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Rendering based on Active Tab */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs text-slate-500">กำลังโหลดข้อมูลคลังทรัพยากรและไฟล์ Google Drive...</p>
        </div>
      ) : activeTab === 'resources' ? (
        // =====================================================================
        // TAB 1: School Documents & Templates
        // =====================================================================
        filteredResources.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <FolderOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800">
              {isAdmin ? 'ยังไม่มีไฟล์เอกสารในหมวดหมู่นี้' : 'ยังไม่มีเอกสารในหมวดหมู่นี้'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              กดปุ่ม "+ เพิ่มไฟล์เข้า Google Drive" เพื่ออัปโหลดเอกสารส่วนกลาง แม่แบบ หรือแบบฟอร์มโรงเรียน
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((item) => {
              const canDelete = isAdmin
              const isDirectFile = !item.url.includes('drive.google.com')

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all shadow-xs group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-xl bg-emerald-50 p-2.5 border border-emerald-100">
                          {renderCategoryIcon(item.category)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {renderFileBadge(item.file_type, item.url)}
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              {item.category}
                            </span>
                          </div>
                          {item.user_groups?.name && (
                            <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">
                              {item.user_groups.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {canDelete && (
                        <button
                          onClick={() => handleDeleteResource(item)}
                          title="ลบทรัพยากร"
                          className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug">
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                      {item.file_size && (
                        <span>{(item.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                      )}
                      <span>•</span>
                      <span>{new Date(item.created_at).toLocaleDateString('th-TH')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleCopyLink(item.url)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 transition-colors cursor-pointer"
                      title="คัดลอกลิงก์"
                    >
                      <Copy className="h-3 w-3" />
                      <span className="hidden sm:inline">คัดลอกลิงก์</span>
                    </button>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={isDirectFile}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                    >
                      {isDirectFile ? (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          <span>ดาวน์โหลด / เปิดไฟล์</span>
                        </>
                      ) : (
                        <>
                          <span>เปิดใน Google Drive</span>
                          <ExternalLink className="h-3 w-3" />
                        </>
                      )}
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        // =====================================================================
        // TAB 2: Teacher Task Submissions Archive
        // =====================================================================
        filteredSubmittedFiles.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800">
              ยังไม่มีไฟล์ส่งงานในหมวดหมู่นี้
            </p>
            <p className="text-xs text-slate-500 mt-1">
              เมื่อคุณครูทำการส่งงานย่อยในภาระงาน ไฟล์จะถูกบันทึกเข้า Google Drive และปรากฏในหน้านี้โดยอัตโนมัติ
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubmittedFiles.map((item) => {
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all shadow-xs"
                >
                  <div>
                    {/* Header: Category & Status */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 border border-emerald-200">
                        📁 {item.task_category}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {item.status === 'approved' ? (
                          <>
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                            <span>อนุมัติแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-2.5 w-2.5 text-blue-600" />
                            <span>ส่งแล้ว (รอตรวจ)</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Task Title & Subtask badge */}
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {item.task_title}
                    </h3>

                    {item.subtask_title && (
                      <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        <span>🎯 งานย่อย:</span>
                        <strong className="text-emerald-800">{item.subtask_title}</strong>
                      </div>
                    )}

                    {/* Teacher Profile Card */}
                    <div className="mt-3 flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-150">
                      <img
                        src={getAvatarUrl(item.teacher_avatar, item.teacher_name)}
                        alt={item.teacher_name}
                        className="h-7 w-7 rounded-full object-cover border border-slate-200 bg-white shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.teacher_name}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          @{item.teacher_username}
                          {item.teacher_group_name && ` • ${item.teacher_group_name}`}
                        </p>
                      </div>
                    </div>

                    {/* File Name & Metadata */}
                    <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-700">
                      {renderFileBadge(item.file_type, item.file_url)}
                      <span className="font-semibold truncate">{item.file_name}</span>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                      {item.file_size && (
                        <span>{(item.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                      )}
                      {item.submitted_at && (
                        <>
                          <span>•</span>
                          <span>ส่งเมื่อ {new Date(item.submitted_at).toLocaleDateString('th-TH')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleCopyLink(item.file_url)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 transition-colors cursor-pointer"
                      title="คัดลอกลิงก์ไฟล์ Google Drive"
                    >
                      <Copy className="h-3 w-3" />
                      <span className="hidden sm:inline">คัดลอก</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {item.drive_folder_url && (
                        <a
                          href={item.drive_folder_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="เปิดโฟลเดอร์ภาระงานใน Google Drive"
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                        >
                          <FolderOpen className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">โฟลเดอร์</span>
                        </a>
                      )}

                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                      >
                        <span>เปิดใน Drive</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ===================================================================== */}
      {/* Modal: Add File / Drive Resource (Google Drive Synced) */}
      {/* ===================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-emerald-600" />
                <span>เพิ่มไฟล์เข้าสู่ Google Drive โรงเรียน</span>
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <span>{formError}</span>
                </div>
              )}

              {/* Mode Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  รูปแบบการจัดเก็บ
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAddMode('upload')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      addMode === 'upload'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>อัปโหลดเข้า Google Drive โดยตรง</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddMode('link')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      addMode === 'link'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>บันทึกลิงก์ Google Drive</span>
                  </button>
                </div>
              </div>

              {/* Drag & Drop File Upload Box (If upload mode) */}
              {addMode === 'upload' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    เลือกไฟล์เอกสาร <span className="text-red-500">*</span>
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                      isDragging
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-300 hover:border-emerald-400 bg-slate-50/70'
                    }`}
                    onClick={() => document.getElementById('hub-file-upload')?.click()}
                  >
                    <input
                      id="hub-file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.png,.jpg,.jpeg,.zip"
                    />

                    {fileToUpload ? (
                      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-emerald-300">
                        <div className="flex items-center gap-2.5 truncate text-left">
                          <FileText className="h-6 w-6 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-900 truncate">{fileToUpload.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFileToUpload(null)
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="h-7 w-7 text-emerald-600 mx-auto" />
                        <p className="text-xs font-semibold text-slate-800">
                          ลากและวางไฟล์ลงที่นี่ หรือคลิกเพื่อเลือกไฟล์
                        </p>
                        <p className="text-[10px] text-slate-500">
                          ระบบจะสร้างโฟลเดอร์ตามหมวดหมู่ใน Google Drive โรงเรียนให้อัตโนมัติ
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Upload Progress Bar */}
                  {uploadProgress && (
                    <div className="mt-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                        <span className="flex items-center gap-1.5">
                          {uploadProgress.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
                          )}
                          <span>{uploadProgress.message}</span>
                        </span>
                        <span>{uploadProgress.percent}%</span>
                      </div>
                      <div className="h-2 w-full bg-emerald-200/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                          style={{ width: `${uploadProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* URL Input (If link mode) */}
              {addMode === 'link' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ลิงก์ Google Drive หรือเอกสาร <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ชื่อไฟล์หรือชื่อทรัพยากร <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น แผนการจัดการเรียนรู้ วิทยาศาสตร์ ป.4 ภาคเรียนที่ 1"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  หมวดหมู่ใน Google Drive <span className="text-red-500">*</span>
                </label>
                <select
                  value={categorySelection}
                  onChange={(e) => setCategorySelection(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="custom">+ เพิ่มหมวดหมู่ใหม่...</option>
                </select>

                {categorySelection === 'custom' && (
                  <input
                    type="text"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    placeholder="ระบุชื่อประเภทใหม่"
                    className="w-full mt-2 rounded-xl border border-emerald-300 bg-emerald-50/50 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  รายละเอียดเพิ่มเติม (คำอธิบาย)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="เช่น เอกสารประกอบการสอนประจำปีการศึกษา 2569"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Group / Department Access */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  การมองเห็น (กลุ่มสาระฯ / แผนก)
                </label>
                <select
                  value={targetGroupId}
                  onChange={(e) => setTargetGroupId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">🌐 เอกสารส่วนกลางโรงเรียน (ครูทุกคนเข้าถึงได้)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      เฉพาะกลุ่มสาระฯ {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังส่งเข้า Google Drive...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>บันทึกเข้า Google Drive</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* Modal: Manage Categories */}
      {/* ===================================================================== */}
      {isManageCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">จัดการประเภททรัพยากร</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManageCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {allCategories.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">ไม่มีประเภททรัพยากรที่เปิดใช้งาน</p>
              ) : (
                allCategories.map((catName) => {
                  const count = resources.filter((r) => r.category === catName).length
                  return (
                    <div
                      key={catName}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-colors"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{catName}</p>
                        <p className="text-[10px] text-slate-400">มีไฟล์ในหมวดนี้ {count} รายการ</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditCategory(catName)}
                          title={`แก้ไขชื่อประเภท "${catName}"`}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-emerald-700 transition-colors cursor-pointer"
                        >
                          <PenLine className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(catName)}
                          title={`ลบประเภท "${catName}"`}
                          className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManageCategoryModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
