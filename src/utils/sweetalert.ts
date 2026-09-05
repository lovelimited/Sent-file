import Swal from 'sweetalert2'

/**
 * Custom SweetAlert2 instance styled with School Work Club Pastel Mint/Emerald Theme
 */
export const showConfirm = async (
  title: string,
  text: string,
  confirmButtonText = 'ยืนยัน',
  cancelButtonText = 'ยกเลิก',
  isDanger = false
): Promise<boolean> => {
  const result = await Swal.fire({
    title,
    text,
    icon: isDanger ? 'warning' : 'question',
    showCancelButton: true,
    confirmButtonColor: isDanger ? '#ef4444' : '#059669', // red-500 or emerald-600
    cancelButtonColor: '#94a3b8', // slate-400
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    focusCancel: isDanger,
    customClass: {
      popup: 'rounded-2xl border border-slate-200 shadow-2xl font-sans',
      title: 'text-slate-900 font-bold text-lg',
      htmlContainer: 'text-slate-600 text-sm',
      confirmButton: 'rounded-xl px-5 py-2.5 font-semibold text-sm shadow-sm transition-all',
      cancelButton: 'rounded-xl px-4 py-2.5 font-medium text-sm transition-all',
    },
  })

  return result.isConfirmed
}

export const showSuccess = async (title: string, text?: string): Promise<void> => {
  await Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonColor: '#059669',
    confirmButtonText: 'ตกลง',
    timer: 2500,
    timerProgressBar: true,
    customClass: {
      popup: 'rounded-2xl border border-slate-200 shadow-2xl font-sans',
      title: 'text-slate-900 font-bold text-lg',
      htmlContainer: 'text-slate-600 text-sm',
      confirmButton: 'rounded-xl px-5 py-2.5 font-semibold text-sm shadow-sm',
    },
  })
}

export const showError = async (title: string, text?: string): Promise<void> => {
  await Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'ตกลง',
    customClass: {
      popup: 'rounded-2xl border border-slate-200 shadow-2xl font-sans',
      title: 'text-slate-900 font-bold text-lg',
      htmlContainer: 'text-slate-600 text-sm',
      confirmButton: 'rounded-xl px-5 py-2.5 font-semibold text-sm shadow-sm',
    },
  })
}

export const showToast = (
  title: string,
  icon: 'success' | 'error' | 'warning' | 'info' = 'success'
): void => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer
      toast.onmouseleave = Swal.resumeTimer
    },
    customClass: {
      popup: 'rounded-xl border border-slate-200 shadow-lg font-sans text-xs',
      title: 'text-xs font-semibold text-slate-800',
    },
  })

  Toast.fire({
    icon,
    title,
  })
}

export default {
  showConfirm,
  showSuccess,
  showError,
  showToast,
}
