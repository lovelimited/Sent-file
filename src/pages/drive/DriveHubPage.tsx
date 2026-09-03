import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FolderOpen,
  FileText,
  BookOpen,
  Image as ImageIcon,
  ExternalLink,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Search,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { DriveResourceCategory, UserGroup } from '@/types/index'
import { fetchGroups } from '@/services/userService'
import {
  fetchDriveResources,
  createDriveResource,
  deleteDriveResource,
  type DriveResourceWithGroup,
} from '@/services/driveService'

export const DriveHubPage: React.FC = () => {
  const { user, isAdmin } = useAuth()

  const [resources, setResources] = useState<DriveResourceWithGroup[]>([])
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Add Resource Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<DriveResourceCategory>('template')
  const [url, setUrl] = useState('')
  const [targetGroupId, setTargetGroupId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadData = useCallback(() => {
    setIsLoading(true)
    Promise.all([fetchDriveResources(), fetchGroups()]).then(([resData, grpData]) => {
      if (resData.data) setResources(resData.data)
      if (grpData.data) setGroups(grpData.data)
      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    let isMounted = true
    Promise.all([fetchDriveResources(), fetchGroups()]).then(([resData, grpData]) => {
      if (isMounted) {
        if (resData.data) setResources(resData.data)
        if (grpData.data) setGroups(grpData.data)
        setIsLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const matchCategory = activeCategory === 'all' || item.category === activeCategory
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchCategory && matchSearch
    })
  }, [resources, activeCategory, searchQuery])

  const handleOpenAddModal = () => {
    setTitle('')
    setDescription('')
    setCategory('template')
    setUrl('')
    setTargetGroupId('')
    setFormError(null)
    setIsAddModalOpen(true)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!title.trim()) {
      setFormError('กรุณากรอกชื่อทรัพยากร')
      return
    }
    if (!url.trim()) {
      setFormError('กรุณาระบุลิงก์ Google Drive หรือเอกสาร')
      return
    }

    setIsSubmitting(true)
    const res = await createDriveResource({
      title,
      description,
      category,
      url,
      group_id: targetGroupId || null,
      created_by: user?.id,
    })
    setIsSubmitting(false)

    if (res.success) {
      setIsAddModalOpen(false)
      setFeedback({ type: 'success', message: `เพิ่มทรัพยากร "${title}" เรียบร้อยแล้ว` })
      loadData()
    } else {
      setFormError(res.error || 'ไม่สามารถเพิ่มทรัพยากรได้')
    }
  }

  const handleDeleteResource = async (item: DriveResourceWithGroup) => {
    if (!window.confirm(`คุณต้องการลบทรัพยากร "${item.title}" ใช่หรือไม่?`)) return

    const res = await deleteDriveResource(item.id, user?.id)
    if (res.success) {
      setFeedback({ type: 'success', message: `ลบทรัพยากร "${item.title}" เรียบร้อยแล้ว` })
      loadData()
    } else {
      setFeedback({ type: 'error', message: res.error || 'ไม่สามารถลบได้' })
    }
  }

  const renderCategoryIcon = (cat: DriveResourceCategory) => {
    switch (cat) {
      case 'folder':
        return <FolderOpen className="h-5 w-5 text-amber-400" />
      case 'template':
        return <FileText className="h-5 w-5 text-blue-400" />
      case 'guideline':
        return <BookOpen className="h-5 w-5 text-emerald-400" />
      case 'asset':
        return <ImageIcon className="h-5 w-5 text-purple-400" />
    }
  }

  const renderCategoryName = (cat: DriveResourceCategory) => {
    switch (cat) {
      case 'folder':
        return 'โฟลเดอร์ Drive'
      case 'template':
        return 'แม่แบบเอกสาร'
      case 'guideline':
        return 'คู่มือ / แนวปฏิบัติ'
      case 'asset':
        return 'ตราสัญลักษณ์ / สื่อ'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FolderOpen className="h-6 w-6 text-amber-400" />
            <span>คลัง Google Drive & ทรัพยากรโรงเรียน</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            ศูนย์รวมโฟลเดอร์กลาง โฟลเดอร์กลุ่มสาระฯ และแม่แบบเอกสารทางการของโรงเรียน
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่มทรัพยากร</span>
          </button>
        )}
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white cursor-pointer ml-4"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="ค้นหาโฟลเดอร์ หรือแม่แบบ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5 border border-slate-800 rounded-xl p-1 bg-slate-950/60 text-xs">
          <button
            onClick={() => setActiveCategory('all')}
            className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setActiveCategory('folder')}
            className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
              activeCategory === 'folder'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            โฟลเดอร์ Drive
          </button>
          <button
            onClick={() => setActiveCategory('template')}
            className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
              activeCategory === 'template'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            แม่แบบเอกสาร
          </button>
          <button
            onClick={() => setActiveCategory('guideline')}
            className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
              activeCategory === 'guideline'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            คู่มือปฏิบัติงาน
          </button>
          <button
            onClick={() => setActiveCategory('asset')}
            className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
              activeCategory === 'asset'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ตราสัญลักษณ์
          </button>
        </div>
      </div>

      {/* Grid of Resources */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
          <p className="text-xs text-slate-400">กำลังโหลดคลังทรัพยากร...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <FolderOpen className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300">ไม่พบทรัพยากรในหมวดหมู่นี้</p>
          <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-xl bg-slate-800/80 p-2.5 border border-slate-700/60">
                      {renderCategoryIcon(item.category)}
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {renderCategoryName(item.category)}
                      </span>
                      {item.user_groups?.name && (
                        <span className="block text-[10px] text-blue-400 font-medium">
                          {item.user_groups.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteResource(item)}
                      title="ลบทรัพยากร"
                      className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">{item.title}</h3>

                {item.description && (
                  <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                  {item.url}
                </span>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 hover:text-white transition-colors"
                >
                  <span>เปิดใช้งาน</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* Modal: Add Drive Resource */}
      {/* ===================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-amber-400" />
                <span>เพิ่มทรัพยากร / โฟลเดอร์ Google Drive</span>
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ชื่อทรัพยากร / เอกสาร <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น แม่แบบแผนการสอน ภาคเรียนที่ 1"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  คำอธิบายเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดคำชี้แจงในการใช้งาน หรือข้อกำหนดของเอกสาร..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ประเภททรัพยากร
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DriveResourceCategory)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="template">แม่แบบเอกสาร (Template)</option>
                    <option value="folder">โฟลเดอร์ Drive (Folder)</option>
                    <option value="guideline">คู่มือ / แนวปฏิบัติ</option>
                    <option value="asset">ตราสัญลักษณ์ / สื่อ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    กลุ่มสาระฯ ที่เกี่ยวข้อง
                  </label>
                  <select
                    value={targetGroupId}
                    onChange={(e) => setTargetGroupId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
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

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ลิงก์ Google Drive / Google Docs / Sheets <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50 cursor-pointer transition-colors"
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
    </div>
  )
}
