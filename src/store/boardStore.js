import { defineStore } from 'pinia';
import wordpressAPI from '../services/wordpressApi';

export const useBoardStore = defineStore('boardStore', {
  state: () => ({
    boards: [],
  }),
  actions: {
    async loadCategories() {
      try {
        const response = await wordpressAPI.getCategories();
        if (response.success) {
          this.boards = await Promise.all(
            response.data.map(async category => {
              const tasksResponse = await wordpressAPI.getTasksByCategory(category.id);
              return {
                id: category.id,
                name: category.slug,
                title: category.name,
                tasks: tasksResponse.success
                  ? tasksResponse.data.map(task => ({
                      id: task.id,
                      text: task.title,
                      content: task.content,
                    }))
                  : [],
              };
            })
          );
        } else {
          throw new Error(response.error.message || 'Erreur lors du chargement des catégories');
        }
      } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
      }
    },
  },
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'boardStore',
        storage: localStorage,
      },
    ],
  },
});
