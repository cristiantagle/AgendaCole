export function toast(message: string, type?: 'info'|'success'|'error'|'warning'){
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
}

