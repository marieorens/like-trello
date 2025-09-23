<template>
  <div class="comment-manager">
    <!-- En-tête avec info article -->
    <div class="comment-header" v-if="post">
      <div class="post-info">
        <h3>
          <i class="fas fa-comments"></i>
          Commentaires : {{ post.title }}
        </h3>
        <span class="comment-count">{{ comments.length }} commentaire(s)</span>
      </div>
      <button class="btn btn-secondary" @click="$emit('close')">
        <i class="fas fa-times"></i> Fermer
      </button>
    </div>

    <!-- Zone de saisie nouveau commentaire -->
    <div class="comment-form-section">
      <form @submit.prevent="submitComment" class="comment-form">
        <div class="form-group">
          <label for="commentAuthor">Nom de l'auteur</label>
          <input
            id="commentAuthor"
            type="text"
            v-model="commentForm.author"
            placeholder="Votre nom"
            maxlength="50"
          />
        </div>

        <div class="form-group">
          <label for="commentContent">Votre commentaire *</label>
          <textarea
            id="commentContent"
            v-model="commentForm.content"
            placeholder="Écrivez votre commentaire..."
            rows="3"
            required
            maxlength="1000"
          ></textarea>
        </div>

        <div class="form-actions">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="!commentForm.content.trim() || submitting"
          >
            <i class="fas fa-spinner fa-spin" v-if="submitting"></i>
            <i class="fas fa-comment" v-else></i>
            {{ submitting ? 'Ajout...' : 'Ajouter le commentaire' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Indicateur de chargement -->
    <div v-if="loading" class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i> Chargement des commentaires...
    </div>

    <!-- Message d'erreur -->
    <div v-if="error" class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      {{ error }}
      <button class="btn btn-sm" @click="error = null">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- Liste des commentaires -->
    <div v-if="!loading" class="comments-list">
      <div v-for="comment in sortedComments" :key="comment.id" class="comment-item">
        <div class="comment-header-item">
          <div class="comment-author">
            <i class="fas fa-user-circle"></i>
            {{ comment.author || 'Utilisateur anonyme' }}
          </div>
          <div class="comment-meta">
            <span class="comment-date">{{ formatDate(comment.date) }}</span>
            <button
              class="btn-icon btn-delete"
              @click="confirmDeleteComment(comment)"
              :disabled="deleting"
              title="Supprimer le commentaire"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>

        <div class="comment-content" v-html="comment.content"></div>
      </div>

      <!-- Message si aucun commentaire -->
      <div v-if="comments.length === 0" class="no-comments">
        <i class="fas fa-comment-slash"></i>
        <p>Aucun commentaire pour cette carte</p>
        <p>Soyez le premier à commenter !</p>
      </div>
    </div>
  </div>
</template>

<script>
import wordpressAPI from '../services/wordpressApi.js';

export default {
  name: 'CommentManager',

  props: {
    post: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      // États de l'interface
      loading: false,
      submitting: false,
      deleting: false,
      error: null,

      // Données des commentaires
      comments: [],

      // Formulaire de commentaire
      commentForm: {
        content: '',
        author: 'Utilisateur',
        email: 'user@example.com',
      },
    };
  },

  computed: {
    /**
     * Commentaires triés par date (plus récent en premier)
     */
    sortedComments() {
      return [...this.comments].sort((a, b) => new Date(b.date) - new Date(a.date));
    },
  },

  async mounted() {
    if (this.post && this.post.id) {
      await this.loadComments();
    }
  },

  watch: {
    // Recharger les commentaires si l'article change
    'post.id': {
      handler(newId) {
        if (newId) {
          this.loadComments();
        }
      },
      immediate: true,
    },
  },

  methods: {
    /**
     * Charge les commentaires de l'article
     */
    async loadComments() {
      if (!this.post || !this.post.id) {
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        const result = await wordpressAPI.getComments(this.post.id);

        if (result.success) {
          this.comments = result.data;
          this.$emit('comments-loaded', {
            postId: this.post.id,
            comments: result.data,
          });
        } else {
          this.error = result.error?.message || 'Erreur lors du chargement des commentaires';
        }
      } catch (err) {
        this.error = 'Impossible de charger les commentaires';
        console.error('Erreur chargement commentaires:', err);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Soumet un nouveau commentaire
     */
    async submitComment() {
      if (!this.commentForm.content.trim()) {
        return;
      }

      this.submitting = true;
      this.error = null;

      try {
        const result = await wordpressAPI.createComment(this.post.id, {
          content: this.commentForm.content,
          author: this.commentForm.author || 'Utilisateur',
          email: this.commentForm.email,
        });

        if (result.success) {
          // Ajouter le nouveau commentaire à la liste
          this.comments.unshift(result.data); // Ajouter au début

          // Réinitialiser le formulaire
          this.commentForm.content = '';

          // Émettre l'événement
          this.$emit('comment-created', {
            postId: this.post.id,
            comment: result.data,
          });

          // Notification de succès
          this.$swal.fire({
            title: 'Commentaire ajouté !',
            text: 'Votre commentaire a été publié avec succès.',
            icon: 'success',
            timer: 3000,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
          });
        } else {
          throw new Error(result.error?.message || "Erreur lors de l'ajout du commentaire");
        }
      } catch (err) {
        this.error = err.message;
        console.error('Erreur ajout commentaire:', err);
      } finally {
        this.submitting = false;
      }
    },

    /**
     * Confirme la suppression d'un commentaire
     */
    async confirmDeleteComment(comment) {
      const confirmed = await this.$swal.fire({
        title: 'Supprimer le commentaire ?',
        text: 'Cette action est irréversible.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Oui, supprimer',
        cancelButtonText: 'Annuler',
        reverseButtons: true,
      });

      if (confirmed.isConfirmed) {
        await this.deleteComment(comment);
      }
    },

    /**
     * Supprime un commentaire
     */
    async deleteComment(comment) {
      this.deleting = true;
      this.error = null;

      try {
        const result = await wordpressAPI.deleteComment(comment.id);

        if (result.success) {
          // Supprimer de la liste
          this.comments = this.comments.filter(c => c.id !== comment.id);

          this.$emit('comment-deleted', {
            postId: this.post.id,
            commentId: comment.id,
          });

          this.$swal.fire({
            title: 'Supprimé !',
            text: 'Le commentaire a été supprimé.',
            icon: 'success',
            timer: 3000,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
          });
        } else {
          throw new Error(result.error?.message || 'Erreur lors de la suppression');
        }
      } catch (err) {
        this.error = err.message;
        console.error('Erreur suppression commentaire:', err);
      } finally {
        this.deleting = false;
      }
    },

    /**
     * Formate une date pour l'affichage
     */
    formatDate(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;

      // Si moins d'une heure
      if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
      }

      // Si moins d'un jour
      if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
      }

      // Si moins d'une semaine
      if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
      }

      // Format complet pour les dates plus anciennes
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    },

    /**
     * Actualise les commentaires
     */
    async refreshComments() {
      await this.loadComments();
    },
  },
};
</script>

<style scoped>
.comment-manager {
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #eee;
}

.post-info h3 {
  margin: 0;
  color: #333;
  display: flex;
  align-items: center;
  gap: 10px;
}

.comment-count {
  font-size: 14px;
  color: #666;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 12px;
  margin-top: 5px;
  display: inline-block;
}

.comment-form-section {
  margin-bottom: 25px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.comment-form {
  max-width: 600px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.comments-list {
  max-height: 500px;
  overflow-y: auto;
}

.comment-item {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background: white;
  transition: all 0.2s;
}

.comment-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.comment-header-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.comment-author {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.comment-author i {
  color: #007bff;
  font-size: 16px;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.comment-date {
  font-size: 12px;
  color: #666;
}

.comment-content {
  line-height: 1.6;
  color: #444;
  font-size: 14px;
}

.comment-content p {
  margin: 0;
}

.btn-icon {
  background: none;
  border: none;
  padding: 4px 6px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  color: #999;
}

.btn-icon:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
}

.btn-delete {
  color: #dc3545;
}

.btn-delete:hover:not(:disabled) {
  background: rgba(220, 53, 69, 0.1);
}

.no-comments {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.no-comments i {
  font-size: 48px;
  margin-bottom: 15px;
  color: #ddd;
}

.no-comments p {
  margin: 5px 0;
}

.loading-spinner {
  text-align: center;
  padding: 30px;
  color: #666;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
}

/* Styles des boutons */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

/* Animation spinner */
.fa-spin {
  animation: fa-spin 1s infinite linear;
}

@keyframes fa-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .comment-manager {
    padding: 15px;
  }

  .comment-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .comment-header-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .comment-meta {
    align-self: flex-end;
  }
}
</style>
