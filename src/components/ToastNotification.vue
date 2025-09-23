<template>
  <div class="toast-container">
    <transition-group name="toast" tag="div">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
        @click="removeToast(toast.id)"
      >
        <div class="toast-icon">
          <i :class="getToastIcon(toast.type)"></i>
        </div>
        <div class="toast-content">
          <h4 v-if="toast.title" class="toast-title">{{ toast.title }}</h4>
          <p class="toast-message">{{ toast.message }}</p>
        </div>
        <button class="toast-close" @click.stop="removeToast(toast.id)">
          <i class="fas fa-times"></i>
        </button>
        <div class="toast-progress" :style="{ animationDuration: `${toast.duration}ms` }"></div>
      </div>
    </transition-group>
  </div>
</template>

<script>
export default {
  name: 'ToastNotification',

  data() {
    return {
      toasts: [],
      nextId: 1,
    };
  },

  methods: {
    show({ type = 'info', title = null, message, duration = 5000 }) {
      const toast = {
        id: this.nextId++,
        type,
        title,
        message,
        duration,
      };

      this.toasts.push(toast);

      // Auto-remove after duration
      setTimeout(() => {
        this.removeToast(toast.id);
      }, duration);

      return toast.id;
    },

    removeToast(id) {
      const index = this.toasts.findIndex(t => t.id === id);
      if (index > -1) {
        this.toasts.splice(index, 1);
      }
    },

    getToastIcon(type) {
      const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-triangle',
        warning: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        loading: 'fas fa-spinner fa-spin',
      };
      return icons[type] || icons.info;
    },

    // API methods for easy usage
    success(message, title = null, duration = 4000) {
      return this.show({ type: 'success', title, message, duration });
    },

    error(message, title = 'Erreur', duration = 6000) {
      return this.show({ type: 'error', title, message, duration });
    },

    warning(message, title = 'Attention', duration = 5000) {
      return this.show({ type: 'warning', title, message, duration });
    },

    info(message, title = null, duration = 4000) {
      return this.show({ type: 'info', title, message, duration });
    },

    loading(message, title = 'Chargement...', duration = 10000) {
      return this.show({ type: 'loading', title, message, duration });
    },
  },
};
</script>

<style lang="scss" scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;
  max-width: 400px;
  width: 100%;
}

.toast {
  position: relative;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  margin-bottom: 15px;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  pointer-events: auto;
  overflow: hidden;
  min-height: 70px;
  transition: all 0.3s ease;
  border-left: 4px solid transparent;

  &:hover {
    transform: translateX(-5px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
  }

  &.toast-success {
    border-left-color: #27ae60;

    .toast-icon {
      color: #27ae60;
    }
  }

  &.toast-error {
    border-left-color: #e74c3c;

    .toast-icon {
      color: #e74c3c;
    }
  }

  &.toast-warning {
    border-left-color: #f39c12;

    .toast-icon {
      color: #f39c12;
    }
  }

  &.toast-info {
    border-left-color: #3498db;

    .toast-icon {
      color: #3498db;
    }
  }

  &.toast-loading {
    border-left-color: #667eea;

    .toast-icon {
      color: #667eea;
    }
  }

  .toast-icon {
    font-size: 20px;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .toast-content {
    flex: 1;
    min-width: 0;

    .toast-title {
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
      margin: 0 0 4px 0;
      line-height: 1.3;
    }

    .toast-message {
      font-size: 13px;
      color: #7f8c8d;
      margin: 0;
      line-height: 1.4;
      word-wrap: break-word;
    }
  }

  .toast-close {
    background: none;
    border: none;
    color: #95a5a6;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    font-size: 14px;
    flex-shrink: 0;
    transition: all 0.3s ease;

    &:hover {
      background: rgba(149, 165, 166, 0.1);
      color: #7f8c8d;
    }
  }

  .toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: currentColor;
    opacity: 0.3;
    animation: progressBar linear forwards;
    transform-origin: left;
  }
}

@keyframes progressBar {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

// Toast animations
.toast-enter-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-leave-active {
  transition: all 0.3s ease-in;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.toast-move {
  transition: transform 0.3s ease;
}

// Responsive
@media (max-width: 768px) {
  .toast-container {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }

  .toast {
    margin-bottom: 10px;
    padding: 14px;

    .toast-icon {
      font-size: 18px;
    }

    .toast-content {
      .toast-title {
        font-size: 13px;
      }

      .toast-message {
        font-size: 12px;
      }
    }
  }
}
</style>
