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
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { UserGroup } from '@/types/index'
import { fetchGroups } from '@/services/userService'
import {
  fetchDriveResources,
  createDriveResource,
  deleteDriveResource,
  type DriveResourceWithGroup,
} from '@/services/driveService'
import { supabase } from '@/services/supabase'
import { showConfirm, showToast, showError, showPrompt } from '@/utils/sweetalert'

const PRESET_CATEGORIES = [
  { id: 'lesson_plan', name: 'แผนการจัดการเรียนรู้' },
  { id: 'pa_report', name: 'รายงานผลการปฏิบัติงาน (PA)' },
  { id: 'research', name: 'วิจัยในชั้นเรียนและนวัตกรรม' },
  { id: 'academic', name: 'เอกสารวัดผลและวิชาการ' },
  { id: 'awards', name: 'เกียรติบัตรและผลงาน' },
  { id: 'forms', name: 'แบบฟอร์มโรงเรียน' },
]

export const DriveHubPage: React.FC = () => {
  const { user, isAdmin } = useAuth()

  const [resources, setResources] = useState<DriveResourceWithGroup[]>([])
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Add Resource Modal (ข้อ 1 & 10)
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
    Promise.all([fetchDriveResources(user?.id, isAdmin), fetchGroups()]).then(([resData, grpData]) => {
      if (resData.data) setResources(resData.data)
      if (grpData.data) setGroups(grpData.data)
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
  }, [user?.id, isAdmin])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Extract all unique categories dynamically
  const allCategories = useMemo(() => {
    const set = new Set<string>()
    // 1. Default presets that are not deleted
    PRESET_CATEGORIES.forEach((p) => {
      if (!deletedCategories.includes(p.name)) {
        set.add(p.name)
      }
    })
    // 2. Custom categories that are not deleted
    customCategories.forEach((c) => {
      if (!deletedCategories.includes(c)) {
        set.add(c)
      }
    })
    // 3. Existing items that are not deleted
    resources.forEach((r) => {
      if (r.category && !deletedCategories.includes(r.category)) {
        set.add(r.category)
      }
    })
    return Array.from(set)
  }, [resources, deletedCategories, customCategories])

  const handleEditCategory = async (oldName: string) => {
    const newName = await showPrompt(
      'แก้ไขชื่อประเภททรัพยากร',
      'กรุณาระบุชื่อประเภทใหม่',
      oldName,
      'บันทึกชื่อใหม่'
    )
    if (!newName || newName === oldName) return

    const trimmed = newName.trim()
    // 1. Update database resources with this category
    const { error: updateErr } = await supabase
      .from('drive_resources')
      .update({ category: trimmed })
      .eq('category', oldName)

    if (updateErr) {
      showError('ไม่สามารถแก้ไขชื่อประเภทได้', updateErr.message)
      return
    }

    // 2. If oldName was preset, mark old preset as deleted so it doesn't revert
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

    // 3. Add newName to customCategories and remove oldName if existed
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

    // 4. Update UI states
    if (activeCategory === oldName) {
      setActiveCategory(trimmed)
    }
    if (categorySelection === oldName) {
      setCategorySelection(trimmed)
    }

    showToast(`เปลี่ยนชื่อประเภทเป็น "${trimmed}" เรียบร้อยแล้ว`, 'success')
    loadData()
  }

  const handleDeleteCategory = async (catName: string) => {
    const matchingCount = resources.filter((r) => r.category === catName).length
    const confirmed = await showConfirm(
      `ยืนยันการลบประเภท "${catName}"?`,
      matchingCount > 0
        ? `มีทรัพยากรในประเภทนี้ ${matchingCount} รายการ โดยไฟล์จะถูกเปลี่ยนเป็นหมวด "ทั่วไป" ให้โดยอัตโนมัติ`
        : `ประเภท "${catName}" จะถูกลบออกจากแถบตัวเลือกและระบบ`,
      'ลบประเภท',
      'ยกเลิก',
      true
    )
    if (!confirmed) return

    // Reassign resources in database to "ทั่วไป" if any
    if (matchingCount > 0) {
      await supabase.from('drive_resources').update({ category: 'ทั่วไป' }).eq('category', catName)
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

    if (activeCategory === catName) {
      setActiveCategory('all')
    }
    if (categorySelection === catName) {
      setCategorySelection(allCategories.find((c) => c !== catName) || 'ทั่วไป')
    }

    showToast(`ลบประเภท "${catName}" เรียบร้อยแล้ว`, 'success')
    loadData()
  }

  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const matchCategory =
        activeCategory === 'all' ||
        item.category === activeCategory

      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())

      return matchCategory && matchSearch
    })
  }, [resources, activeCategory, searchQuery])

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

    // Determine final category
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

    // Mode A: File Upload (ข้อ 10)
    if (addMode === 'upload') {
      if (!fileToUpload) {
        setIsSubmitting(false)
        setFormError('กรุณาเลือกไฟล์ที่ต้องการอัปโหลดเข้าคลัง')
        return
      }

      try {
        const fileExt = fileToUpload.name.split('.').pop()?.toLowerCase() || 'dat'
        fileType = fileExt
        fileSize = fileToUpload.size

        const safeName = fileToUpload.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .substring(0, 40)
        const filePath = `files/${Date.now()}_${safeName}.${fileExt}`

        const { error: uploadErr } = await supabase.storage
          .from('resources')
          .upload(filePath, fileToUpload, { upsert: true })

        if (uploadErr) {
          setIsSubmitting(false)
          setFormError(`อัปโหลดไฟล์ไม่สำเร็จ: ${uploadErr.message}`)
          return
        }

        const { data: publicData } = supabase.storage.from('resources').getPublicUrl(filePath)
        finalUrl = publicData.publicUrl
      } catch (err: unknown) {
        setIsSubmitting(false)
        setFormError(err instanceof Error ? err.message : 'Upload failed')
        return
      }
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
      showToast(`เพิ่ม "${title}" เข้าสู่คลังเรียบร้อยแล้ว`, 'success')
      loadData()
    } else {
      setFormError(res.error || 'ไม่สามารถเพิ่มทรัพยากรได้')
    }
  }

  const handleDeleteResource = async (item: DriveResourceWithGroup) => {
    // Requirement 8: Deletion restricted to Admin only
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

  // File type icons and badges (ข้อ 10)
  const renderFileBadge = (item: DriveResourceWithGroup) => {
    const ext = item.file_type?.toLowerCase() || (item.url.includes('drive.google.com') ? 'drive' : 'file')

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
    if (ext === 'drive') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-yellow-100 text-yellow-800 px-2 py-0.5 text-[10px] font-bold border border-yellow-200">
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
    if (cat.includes('โฟลเดอร์') || cat === 'folder') return <FolderOpen className="h-5 w-5 text-amber-600" />
    if (cat.includes('แม่แบบ') || cat === 'template') return <FileText className="h-5 w-5 text-emerald-600" />
    if (cat.includes('คู่มือ') || cat === 'guideline') return <BookOpen className="h-5 w-5 text-teal-600" />
    if (cat.includes('สื่อ') || cat === 'asset') return <ImageIcon className="h-5 w-5 text-purple-600" />
    return <File className="h-5 w-5 text-emerald-600" />
  }

  return (
    <div className="space-y-6">
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
              <span>{isAdmin ? 'โหมดผู้ดูแลระบบ: แสดงคลังทั้งหมด' : 'คลังส่วนตัว: แสดงเฉพาะของตนเอง'}</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FolderOpen className="h-6 w-6 text-emerald-600" />
            <span>{isAdmin ? 'คลังไฟล์ & ทรัพยากรโรงเรียน' : 'คลังไฟล์ & เอกสารของฉัน'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ศูนย์กลางจัดเก็บและดาวน์โหลดไฟล์เอกสาร แม่แบบ และทรัพยากรการศึกษาของโรงเรียน
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>เพิ่มไฟล์ / ทรัพยากร</span>
        </button>
      </div>

      {/* Search & Dynamic Category Filter (ข้อ 1) */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาไฟล์ หรือประเภท..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none shadow-2xs"
          />
        </div>

        {/* Dynamic Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5 border border-slate-200 rounded-xl p-1 bg-white text-xs shadow-2xs overflow-x-auto">
          <button
            onClick={() => setActiveCategory('all')}
            className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer shrink-0 ${
              activeCategory === 'all'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ทั้งหมด ({resources.length})
          </button>
          {allCategories.map((catName) => (
            <button
              key={catName}
              onClick={() => setActiveCategory(catName)}
              className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer shrink-0 ${
                activeCategory === catName
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {catName}
            </button>
          ))}

          {/* Manage Categories Button */}
          <button
            type="button"
            onClick={() => setIsManageCategoryModalOpen(true)}
            title="จัดการ / แก้ไข / ลบประเภททรัพยากร"
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors border border-dashed border-slate-300 shrink-0 cursor-pointer ml-1"
          >
            <Settings className="h-3 w-3 text-slate-500" />
            <span>จัดการประเภท</span>
          </button>
        </div>
      </div>

      {/* Grid of Resources (ข้อ 10: File-Centric display) */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs text-slate-500">กำลังโหลดคลังทรัพยากร...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <FolderOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">
            {isAdmin ? 'ยังไม่มีทรัพยากรในหมวดหมู่นี้' : 'คุณยังไม่มีทรัพยากรในคลังส่วนตัว'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            กดปุ่ม "เพิ่มไฟล์ / ทรัพยากร" เพื่ออัปโหลดไฟล์เอกสาร หรือบันทึกลิงก์ Google Drive
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((item) => {
            // Requirement 8: Deletion allowed ONLY for admins
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
                          {renderFileBadge(item)}
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

                  <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* File Metadata */}
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
                    <span className="hidden sm:inline">คัดลอก</span>
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
                        <span>เปิดใช้งาน Drive</span>
                        <ExternalLink className="h-3 w-3" />
                      </>
                    )}
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* Modal: Add File / Drive Resource (ข้อ 1 & 10) */}
      {/* ===================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-emerald-600" />
                <span>{isAdmin ? 'เพิ่มไฟล์ / ทรัพยากรโรงเรียน' : 'เพิ่มไฟล์ / ทรัพยากรส่วนตัว'}</span>
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
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

              {/* Mode Toggle: File Upload vs External Link (ข้อ 10) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  รูปแบบทรัพยากร
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
                    <span>อัปโหลดไฟล์เอกสาร</span>
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
                    <span>ลิงก์ Google Drive</span>
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
                          รองรับ PDF, Word, Excel, PowerPoint, รูปภาพ, ZIP
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Link Input (If link mode) */}
              {addMode === 'link' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ลิงก์ Google Drive / Google Docs / Sheets <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ชื่อไฟล์ / ชื่อทรัพยากร <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น แม่แบบแผนการสอน ภาคเรียนที่ 1"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  คำอธิบายเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดคำชี้แจงในการใช้งาน หรือข้อกำหนดของเอกสาร..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none resize-none"
                />
              </div>

              {/* Category & Quick Manage (ข้อ 2: แก้ไข/ลบประเภทได้) */}
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                  <label className="block text-xs font-medium text-slate-700">
                    ประเภททรัพยากร <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {categorySelection !== 'custom' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEditCategory(categorySelection)}
                          title="แก้ไขชื่อประเภทที่เลือก"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer border border-emerald-200"
                        >
                          <PenLine className="h-3 w-3" />
                          <span>แก้ไขประเภท</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(categorySelection)}
                          title="ลบประเภทที่เลือก"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer border border-red-200"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>ลบประเภท</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsManageCategoryModalOpen(true)}
                      title="เปิดหน้าต่างจัดการประเภททั้งหมด"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer border border-slate-200"
                    >
                      <Settings className="h-3 w-3" />
                      <span>จัดการทั้งหมด</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={categorySelection}
                      onChange={(e) => setCategorySelection(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                    >
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="custom">➕ เพิ่มประเภทใหม่เอง...</option>
                    </select>
                  </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    กลุ่มสาระฯ ที่เกี่ยวข้อง
                  </label>
                  <select
                    value={targetGroupId}
                    onChange={(e) => setTargetGroupId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">-- ส่วนกลางโรงเรียน --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

              {/* Custom Category input field if selected (ข้อ 1) */}
              {categorySelection === 'custom' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 animate-in fade-in duration-100">
                  <label className="block text-xs font-bold text-emerald-900 mb-1">
                    พิมพ์ชื่อประเภททรัพยากรใหม่ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    placeholder="เช่น แบบประเมิน, ข้อสอบ, เอกสารการเงิน, สื่อการสอน"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-emerald-700 mt-1">
                    ชื่อประเภทนี้จะถูกบันทึกและแสดงในแถบตัวกรองด้านบนให้เลือกได้อัตโนมัติ
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึกทรัพยากร</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* Modal: Manage Categories (ข้อ 3: ลบประเภททรัพยากรที่ไม่ต้องการ) */}
      {/* ===================================================================== */}
      {isManageCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col overflow-hidden max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 bg-gradient-to-r from-emerald-50 to-white">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-emerald-600 p-2 text-white shadow-xs">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">จัดการประเภททรัพยากร</h3>
                  <p className="text-[11px] text-slate-500">สามารถแก้ไขชื่อประเภท หรือลบประเภทที่ไม่ต้องการใช้งานออกได้</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageCategoryModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
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
