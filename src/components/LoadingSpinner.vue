<template>
  <div v-if="show" :class="['loading-spinner', `spinner-${variant}`, { fullscreen: fullscreen }]">
    <div class="spinner-backdrop" v-if="fullscreen" @click="$emit('cancel')"></div>
    <div class="spinner-container">
      <div :class="['spinner', `spinner-type-${type}`]">
        <div v-if="type === 'dots'" class="spinner-dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
        <div v-else-if="type === 'pulse'" class="spinner-pulse"></div>
        <div v-else-if="type === 'ring'" class="spinner-ring">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div v-else class="spinner-circle">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
      </div>

      <div v-if="message" class="spinner-content">
        <h4 v-if="title" class="spinner-title">{{ title }}</h4>
        <p class="spinner-message">{{ message }}</p>
        <div v-if="progress !== null" class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
          </div>
          <span class="progress-text">{{ progress }}%</span>
        </div>
      </div>

      <button v-if="cancellable" @click="$emit('cancel')" class="spinner-cancel">
        <i class="fas fa-times"></i>
        Annuler
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingSpinner',

  props: {
    show: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: 'circle', // circle, dots, pulse, ring
      validator: value => ['circle', 'dots', 'pulse', 'ring'].includes(value),
    },
    variant: {
      type: String,
      default: 'primary', // primary, secondary, success, warning, danger
      validator: value => ['primary', 'secondary', 'success', 'warning', 'danger'].includes(value),
    },
    size: {
      type: String,
      default: 'medium', // small, medium, large
      validator: value => ['small', 'medium', 'large'].includes(value),
    },
    fullscreen: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      default: null,
    },
    progress: {
      type: Number,
      default: null,
      validator: value => value === null || (value >= 0 && value <= 100),
    },
    cancellable: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['cancel'],
};
</script>

<style lang="scss" scoped>
.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;

  &.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9998;
  }

  &.spinner-primary {
    color: #667eea;
  }

  &.spinner-secondary {
    color: #95a5a6;
  }

  &.spinner-success {
    color: #27ae60;
  }

  &.spinner-warning {
    color: #f39c12;
  }

  &.spinner-danger {
    color: #e74c3c;
  }
}

.spinner-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.spinner-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  background: white;
  padding: 30px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  margin: 20px;
  text-align: center;
  z-index: 1;

  .fullscreen & {
    background: white;
    padding: 40px;
  }
}

.spinner {
  display: flex;
  align-items: center;
  justify-content: center;

  &.spinner-type-circle {
    font-size: 40px;
    color: currentColor;
  }

  &.spinner-type-dots {
    .spinner-dots {
      display: flex;
      gap: 8px;

      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: currentColor;
        animation: dotPulse 1.4s ease-in-out infinite both;

        &:nth-child(1) {
          animation-delay: -0.32s;
        }
        &:nth-child(2) {
          animation-delay: -0.16s;
        }
        &:nth-child(3) {
          animation-delay: 0s;
        }
      }
    }
  }

  &.spinner-type-pulse {
    .spinner-pulse {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 2s ease-in-out infinite;
    }
  }

  &.spinner-type-ring {
    .spinner-ring {
      display: inline-block;
      position: relative;
      width: 60px;
      height: 60px;

      div {
        box-sizing: border-box;
        display: block;
        position: absolute;
        width: 48px;
        height: 48px;
        margin: 6px;
        border: 6px solid currentColor;
        border-radius: 50%;
        animation: ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        border-color: currentColor transparent transparent transparent;

        &:nth-child(1) {
          animation-delay: -0.45s;
        }
        &:nth-child(2) {
          animation-delay: -0.3s;
        }
        &:nth-child(3) {
          animation-delay: -0.15s;
        }
      }
    }
  }
}

.spinner-content {
  .spinner-title {
    font-size: 18px;
    font-weight: 600;
    color: #2c3e50;
    margin: 0 0 8px 0;
  }

  .spinner-message {
    font-size: 14px;
    color: #7f8c8d;
    margin: 0 0 15px 0;
    line-height: 1.4;
  }
}

.progress-container {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;

  .progress-bar {
    flex: 1;
    height: 8px;
    background: #ecf0f1;
    border-radius: 4px;
    overflow: hidden;

    .progress-fill {
      height: 100%;
      background: currentColor;
      border-radius: 4px;
      transition: width 0.3s ease;
      background: linear-gradient(90deg, currentColor, rgba(255, 255, 255, 0.3));
      animation: shimmer 2s ease-in-out infinite;
    }
  }

  .progress-text {
    font-size: 12px;
    font-weight: 600;
    color: currentColor;
    min-width: 35px;
  }
}

.spinner-cancel {
  background: none;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  color: #7f8c8d;
  font-size: 14px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: #f8f9fa;
    border-color: #bbb;
    color: #2c3e50;
  }
}

// Animations
@keyframes dotPulse {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.3;
  }
  100% {
    transform: scale(0.8);
    opacity: 1;
  }
}

@keyframes ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

// Responsive
@media (max-width: 768px) {
  .spinner-container {
    margin: 10px;
    padding: 25px;

    .fullscreen & {
      padding: 30px;
    }
  }

  .spinner {
    &.spinner-type-circle {
      font-size: 32px;
    }

    &.spinner-type-ring .spinner-ring {
      width: 50px;
      height: 50px;

      div {
        width: 40px;
        height: 40px;
        margin: 5px;
        border-width: 5px;
      }
    }

    &.spinner-type-pulse .spinner-pulse {
      width: 50px;
      height: 50px;
    }
  }
}
</style>
