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
        this.categories = response.data;
      }
    },
    async addCategory(category) {
      const response = await wordpressAPI.createCategory(category);
      if (response.success) {
        this.categories.push(response.data);
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
