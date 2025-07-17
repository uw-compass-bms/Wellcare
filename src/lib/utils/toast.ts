/**
 * Simple toast notification utility
 */

export interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export class Toast {
  private static toastContainer: HTMLElement | null = null;

  static init() {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'toast-container';
      this.toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 400px;
      `;
      document.body.appendChild(this.toastContainer);
    }
  }

  static show(message: string, options: ToastOptions = { type: 'info' }) {
    this.init();
    
    const toast = document.createElement('div');
    const { type, duration = 4000 } = options;
    
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };

    toast.className = `
      ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg 
      transform transition-all duration-300 ease-in-out
      flex items-center gap-3 max-w-sm
    `;
    
    const icon = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ℹ'
    }[type];

    toast.innerHTML = `
      <span class="font-medium">${icon}</span>
      <span class="flex-1">${message}</span>
      <button onclick="this.parentElement.remove()" class="text-white hover:text-gray-200">
        ×
      </button>
    `;

    this.toastContainer?.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  static success(message: string, duration?: number) {
    this.show(message, { type: 'success', duration });
  }

  static error(message: string, duration?: number) {
    this.show(message, { type: 'error', duration });
  }

  static warning(message: string, duration?: number) {
    this.show(message, { type: 'warning', duration });
  }

  static info(message: string, duration?: number) {
    this.show(message, { type: 'info', duration });
  }
}