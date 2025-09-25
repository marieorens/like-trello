import { defineStore } from 'pinia';
import wordpressAPI from '../services/wordpressApi';

export const useCommentStore = defineStore('commentStore', {
  state: () => ({
    comments: [],
  }),
  actions: {
    async loadComments(taskId) {
      const response = await wordpressAPI.getCommentsByTask(taskId);
      if (response.success) {
        this.comments = response.data;
      }
    },
    async addComment(comment) {
      const response = await wordpressAPI.createComment(comment);
      if (response.success) {
        this.comments.push(response.data);
      }
    },
    async updateComment(comment) {
      const response = await wordpressAPI.updateComment(comment);
      if (response.success) {
        const idx = this.comments.findIndex(c => c.id === comment.id);
        if (idx !== -1) this.comments[idx] = response.data;
      }
    },
    async deleteComment(id) {
      const response = await wordpressAPI.deleteComment(id);
      if (response.success) {
        this.comments = this.comments.filter(c => c.id !== id);
      }
    },
  },
  persist: true,
});
