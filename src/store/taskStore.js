import { defineStore } from 'pinia';
import wordpressAPI from '../services/wordpressApi';

export const useTaskStore = defineStore('taskStore', {
  state: () => ({
    tasks: [],
  }),
  actions: {
    async loadTasks(categoryId) {
      const response = await wordpressAPI.getTasksByCategory(categoryId);
      if (response.success) {
        this.tasks = response.data;
      }
    },
    async addTask(task) {
      const response = await wordpressAPI.createTask(task);
      if (response.success) {
        this.tasks.push(response.data);
      }
    },
    async updateTask(task) {
      const response = await wordpressAPI.updateTask(task);
      if (response.success) {
        const idx = this.tasks.findIndex(t => t.id === task.id);
        if (idx !== -1) this.tasks[idx] = response.data;
      }
    },
    async deleteTask(id) {
      const response = await wordpressAPI.deleteTask(id);
      if (response.success) {
        this.tasks = this.tasks.filter(t => t.id !== id);
      }
    },
  },
  persist: true,
});
