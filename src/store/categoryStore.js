import { defineStore } from 'pinia';
import wordpressAPI from '../services/wordpressApi';

export const useCategoryStore = defineStore('categoryStore', {
  state: () => ({
    categories: [],
  }),
  actions: {
    async loadCategories() {
      const response = await wordpressAPI.getCategories();
      if (response.success) {
        const categoriesWithTasks = await Promise.all(
          response.data.map(async cat => {
            const tasksResponse = await wordpressAPI.getPosts(cat.id);
            return {
              ...cat,
              title: cat.title || cat.name || '',
              tasks: tasksResponse.success ? tasksResponse.data : [],
            };
          })
        );
        this.categories = categoriesWithTasks;
      }
    },
    async addCategory(category) {
      const response = await wordpressAPI.createCategory(category);
      if (response.success) {
        const cat = response.data;
        this.categories.push({
          ...cat,
          title: cat.title || cat.name || '',
          tasks: Array.isArray(cat.tasks) ? cat.tasks : [],
        });
      }
    },
    async updateCategory(category) {
      const response = await wordpressAPI.updateCategory(category);
      if (response.success) {
        const idx = this.categories.findIndex(c => c.id === category.id);
        if (idx !== -1) this.categories[idx] = response.data;
      }
    },
    async deleteCategory(id) {
      const response = await wordpressAPI.deleteCategory(id);
      if (response.success) {
        this.categories = this.categories.filter(c => c.id !== id);
      }
    },
  },
  persist: true,
});
