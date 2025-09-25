<template>
  <div class="modal-overlay" @click.self="closeModal" v-if="isVisible">
    <div class="modal-container">
      <div class="modal-header">
        <div class="card-title-section">
          <div class="card-status-indicator" :class="currentStatus">
            <i :class="statusIcon"></i>
          </div>
          <div class="title-content">
            <h2 v-if="!editingTitle && task" @click="startEditingTitle" class="card-title">
              {{ task && task.title ? task.title.rendered : '' }}
            </h2>
            <input
              v-else
              v-model="editedTitle"
              @blur="saveTitle"
              @keyup.enter="saveTitle"
              @keyup.esc="cancelTitleEdit"
              class="title-input"
              ref="titleInput"
            />
            <div class="card-meta">
              <span class="card-category">
                <i class="fas fa-folder"></i>
                {{ categoryName }}
              </span>
              <span class="card-date">
                <i class="fas fa-calendar"></i>
                Créé le {{ task ? formatDate(task.date) : '' }}
              </span>
              <span v-if="task && task.modified !== task.date" class="card-modified">
                <i class="fas fa-edit"></i>
                Modifié le {{ formatDate(task.modified) }}
              </span>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <div class="status-selector">
            <label>Statut:</label>
            <select v-model="currentStatus" @change="updateStatus">
              <option value="todo">À faire</option>
              <option value="in-progress">En cours</option>
              <option value="completed">Terminé</option>
            </select>
          </div>

          <button class="btn-close" @click="closeModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <div class="modal-body">
        <div class="section description-section">
          <div class="section-header">
            <h3>
              <i class="fas fa-align-left"></i>
              Description
            </h3>
            <button
              v-if="!editingDescription"
              @click="startEditingDescription"
              class="btn-edit-section"
            >
              <i class="fas fa-edit"></i>
              Modifier
            </button>
          </div>
          <div v-if="!editingDescription" class="description-content">
            <div
              v-if="task && task.content && task.content.rendered"
              v-html="task.content.rendered"
              class="description-text"
            ></div>
            <p v-else class="no-description">
              <i class="fas fa-plus"></i>
              Ajouter une description...
            </p>
          </div>
          <div v-else class="description-editor">
            <textarea
              v-model="editedDescription"
              placeholder="Décrivez cette tâche..."
              class="description-textarea"
              rows="4"
              ref="descriptionTextarea"
            ></textarea>
            <div class="editor-actions">
              <button @click="saveDescription" class="btn btn-primary">
                <i class="fas fa-save"></i>
                Sauvegarder
              </button>
              <button @click="cancelDescriptionEdit" class="btn btn-secondary">
                <i class="fas fa-times"></i>
                Annuler
              </button>
            </div>
          </div>
        </div>

        <div class="section comments-section">
          <div class="section-header">
            <h3>
              <i class="fas fa-comments"></i>
              Commentaires
              <span class="comment-count" v-if="comments.length > 0">({{ comments.length }})</span>
            </h3>
          </div>

          <div class="add-comment-form">
            <textarea
              v-model="newComment"
              placeholder="Écrire un commentaire..."
              class="comment-textarea"
              rows="3"
              @keydown.ctrl.enter="addComment"
            ></textarea>
            <div class="comment-actions">
              <button
                @click="addComment"
                :disabled="!newComment.trim() || !task"
                class="btn btn-primary"
              >
                <i class="fas fa-paper-plane"></i>
                Envoyer
              </button>
              <small class="shortcut-hint">Ctrl + Entrée pour envoyer</small>
            </div>
          </div>
          <div class="comments-list">
            <div v-if="loadingComments" class="loading-comments">
              <i class="fas fa-spinner fa-spin"></i>
              Chargement des commentaires...
            </div>
            <div v-else-if="comments.length === 0" class="no-comments">
              <i class="fas fa-comment-slash"></i>
              Aucun commentaire pour le moment
            </div>
            <div v-else>
              <div v-for="comment in comments" :key="comment.id" class="comment-item">
                <div class="comment-header">
                  <div class="comment-author">
                    <i class="fas fa-user-circle"></i>
                    <span>{{ comment.author_name || 'Utilisateur' }}</span>
                  </div>
                  <div class="comment-date">
                    {{ formatDate(comment.date) }}
                  </div>
                  <button @click="deleteComment(comment.id)" class="btn-delete-comment">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
                <div class="comment-content" v-html="comment.content.rendered"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="footer-actions">
          <button @click="deleteTask" class="btn btn-danger">
            <i class="fas fa-trash"></i>
            Supprimer la tâche
          </button>
          <div class="footer-info">
            <span class="task-id">ID: {{ task ? task.id : '' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import wordpressAPI from '../services/wordpressApi';

export default {
  name: 'CardDetailsSafe',
  props: {
    isVisible: {
      type: Boolean,
      default: false,
    },
    task: {
      type: Object,
      required: false,
      default: null,
    },
    categoryName: {
      type: String,
      default: 'Catégorie inconnue',
    },
  },

  data() {
    return {
      // Editing states
      editingTitle: false,
      editingDescription: false,

      // Edited content
      editedTitle: '',
      editedDescription: '',

      // Status
      currentStatus: 'todo',

      // Comments
      comments: [],
      newComment: '',
      loadingComments: false,
    };
  },

  computed: {
    statusIcon() {
      const icons = {
        todo: 'fas fa-inbox',
        'in-progress': 'fas fa-clock',
        completed: 'fas fa-check-circle',
      };
      return icons[this.currentStatus] || 'fas fa-inbox';
    },
  },

  watch: {
    isVisible: {
      immediate: true,
      handler(newValue) {
        if (newValue && this.task) {
          this.initializeCard();
        }
      },
    },

    task: {
      immediate: true,
      handler(newTask) {
        if (newTask && this.isVisible) {
          this.initializeCard();
        }
      },
    },
  },

  methods: {
    initializeCard() {
      if (!this.task) return;
      // Initialize editing fields
      this.editedTitle = this.task.title?.rendered || '';
      this.editedDescription = (this.task.content?.rendered || '').replace(/<[^>]*>/g, '');

      // Initialize status
      this.currentStatus = this.getTaskStatus(this.task);

      // Load comments
      this.loadComments();
    },

    getTaskStatus(post) {
      if (post.meta && post.meta.task_status) {
        return post.meta.task_status;
      }
      if (post.status === 'draft') return 'todo';
      if (post.status === 'pending') return 'in-progress';
      if (post.status === 'publish') return 'completed';
      return 'todo';
    },

    // Title editing
    startEditingTitle() {
      this.editingTitle = true;
      this.$nextTick(() => {
        this.$refs.titleInput.focus();
        this.$refs.titleInput.select();
      });
    },

    async saveTitle() {
      if (!this.task) return;
      if (this.editedTitle.trim() && this.editedTitle !== this.task.title.rendered) {
        try {
          await wordpressAPI.updatePost(this.task.id, {
            title: this.editedTitle.trim(),
          });
          this.$emit('task-updated', {
            ...this.task,
            title: { rendered: this.editedTitle.trim() },
          });
        } catch (error) {
          console.error('Erreur lors de la mise à jour du titre:', error);
          this.$swal.fire('Erreur', 'Impossible de mettre à jour le titre', 'error');
        }
      }
      this.editingTitle = false;
    },

    cancelTitleEdit() {
      this.editedTitle = this.task && this.task.title ? this.task.title.rendered : '';
      this.editingTitle = false;
    },

    // Description editing
    startEditingDescription() {
      this.editingDescription = true;
      this.$nextTick(() => {
        this.$refs.descriptionTextarea.focus();
      });
    },

    async saveDescription() {
      if (!this.task) return;
      try {
        const updatedPost = await wordpressAPI.updatePost(this.task.id, {
          content: this.editedDescription.trim(),
        });
        this.$emit('task-updated', updatedPost);
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la description:', error);
        this.$swal.fire('Erreur', 'Impossible de mettre à jour la description', 'error');
      }
      this.editingDescription = false;
    },

    cancelDescriptionEdit() {
      this.editedDescription =
        this.task && this.task.content && this.task.content.rendered
          ? this.task.content.rendered.replace(/<[^>]*>/g, '')
          : '';
      this.editingDescription = false;
    },

    // Status management
    async updateStatus() {
      if (!this.task) return;
      try {
        await wordpressAPI.updatePost(this.task.id, {
          meta: {
            task_status: this.currentStatus,
          },
        });
        this.$emit('status-changed', this.currentStatus);
      } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        this.$swal.fire('Erreur', 'Impossible de mettre à jour le statut', 'error');
      }
    },

    // Comments management
    async loadComments() {
      if (!this.task) return;
      this.loadingComments = true;
      try {
        this.comments = await wordpressAPI.getComments(this.task.id);
      } catch (error) {
        console.error('Erreur lors du chargement des commentaires:', error);
      } finally {
        this.loadingComments = false;
      }
    },

    async addComment() {
      if (!this.newComment.trim() || !this.task) return;

      try {
        const comment = await wordpressAPI.createComment({
          post: this.task.id,
          content: this.newComment.trim(),
        });

        this.comments.push(comment);
        this.newComment = '';
      } catch (error) {
        console.error("Erreur lors de l'ajout du commentaire:", error);
        this.$swal.fire('Erreur', "Impossible d'ajouter le commentaire", 'error');
      }
    },

    async deleteComment(commentId) {
      const result = await this.$swal.fire({
        title: 'Supprimer ce commentaire?',
        text: 'Cette action ne peut pas être annulée',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Supprimer',
        cancelButtonText: 'Annuler',
      });

      if (result.isConfirmed) {
        try {
          await wordpressAPI.deleteComment(commentId);
          this.comments = this.comments.filter(c => c.id !== commentId);
        } catch (error) {
          console.error('Erreur lors de la suppression du commentaire:', error);
          this.$swal.fire('Erreur', 'Impossible de supprimer le commentaire', 'error');
        }
      }
    },

    // Task management
    async deleteTask() {
      const result = await this.$swal.fire({
        title: 'Supprimer cette tâche?',
        text: 'Cette action supprimera la tâche et tous ses commentaires de façon permanente',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Supprimer définitivement',
        cancelButtonText: 'Annuler',
      });

      if (result.isConfirmed) {
        try {
          await wordpressAPI.deletePost(this.task.id);
          this.$emit('task-deleted', this.task.id);
          this.closeModal();
        } catch (error) {
          console.error('Erreur lors de la suppression de la tâche:', error);
          this.$swal.fire('Erreur', 'Impossible de supprimer la tâche', 'error');
        }
      }
    },

    // Modal management
    closeModal() {
      this.$emit('closeModal');
    },

    // Utilities
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modalAppear 0.3s ease-out;
}

@keyframes modalAppear {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.modal-header {
  padding: 30px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  .card-title-section {
    flex: 1;
    display: flex;
    gap: 15px;

    .card-status-indicator {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: white;
      flex-shrink: 0;

      &.todo {
        background: #3498db;
      }

      &.in-progress {
        background: #f39c12;
      }

      &.completed {
        background: #27ae60;
      }
    }

    .title-content {
      flex: 1;

      .card-title {
        font-size: 24px;
        font-weight: 600;
        color: #2c3e50;
        margin: 0 0 10px 0;
        cursor: pointer;
        padding: 5px;
        border-radius: 5px;
        transition: background-color 0.3s ease;

        &:hover {
          background-color: #f8f9fa;
        }
      }

      .title-input {
        font-size: 24px;
        font-weight: 600;
        color: #2c3e50;
        border: 2px solid #667eea;
        border-radius: 5px;
        padding: 5px 10px;
        width: 100%;
        margin: 0 0 10px 0;

        &:focus {
          outline: none;
          border-color: #5a6fd8;
        }
      }

      .card-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        color: #7f8c8d;
        font-size: 14px;

        span {
          display: flex;
          align-items: center;
          gap: 5px;

          i {
            font-size: 12px;
          }
        }

        .card-category {
          color: #667eea;
          font-weight: 500;
        }
      }
    }
  }

  .header-actions {
    display: flex;
    flex-direction: column;
    gap: 15px;
    align-items: flex-end;

    .status-selector {
      display: flex;
      align-items: center;
      gap: 10px;

      label {
        font-weight: 500;
        color: #2c3e50;
      }

      select {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        background: white;
        cursor: pointer;

        &:focus {
          outline: none;
          border-color: #667eea;
        }
      }
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #95a5a6;
      cursor: pointer;
      padding: 5px;
      border-radius: 50%;
      transition: all 0.3s ease;

      &:hover {
        color: #e74c3c;
        background: rgba(231, 76, 60, 0.1);
      }
    }
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 30px;

  .section {
    margin-bottom: 30px;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;

      h3 {
        font-size: 18px;
        font-weight: 600;
        color: #2c3e50;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 10px;

        i {
          color: #667eea;
        }
      }

      .btn-edit-section {
        background: none;
        border: 1px solid #ddd;
        padding: 8px 15px;
        border-radius: 8px;
        cursor: pointer;
        color: #667eea;
        font-size: 14px;
        transition: all 0.3s ease;

        &:hover {
          background: #667eea;
          color: white;
        }
      }
    }
  }

  .description-section {
    .description-content {
      .description-text {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        border-left: 4px solid #667eea;
        line-height: 1.6;

        ::v-deep {
          p {
            margin: 0 0 10px 0;

            &:last-child {
              margin: 0;
            }
          }
        }
      }

      .no-description {
        color: #95a5a6;
        font-style: italic;
        cursor: pointer;
        padding: 15px;
        text-align: center;
        background: #f8f9fa;
        border: 2px dashed #ddd;
        border-radius: 8px;
        transition: all 0.3s ease;

        &:hover {
          background: #ecf0f1;
          border-color: #667eea;
        }

        i {
          margin-right: 8px;
        }
      }
    }

    .description-editor {
      .description-textarea {
        width: 100%;
        border: 2px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        font-family: inherit;
        font-size: 14px;
        line-height: 1.6;
        resize: vertical;
        min-height: 100px;

        &:focus {
          outline: none;
          border-color: #667eea;
        }
      }

      .editor-actions {
        display: flex;
        gap: 10px;
        margin-top: 10px;
      }
    }
  }

  .comments-section {
    .add-comment-form {
      margin-bottom: 20px;

      .comment-textarea {
        width: 100%;
        border: 2px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        font-family: inherit;
        font-size: 14px;
        line-height: 1.6;
        resize: vertical;

        &:focus {
          outline: none;
          border-color: #667eea;
        }
      }

      .comment-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;

        .shortcut-hint {
          color: #95a5a6;
          font-size: 12px;
        }
      }
    }

    .comments-list {
      .loading-comments,
      .no-comments {
        text-align: center;
        padding: 30px;
        color: #95a5a6;

        i {
          font-size: 24px;
          margin-bottom: 10px;
          display: block;
        }
      }

      .comment-item {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
        border-left: 4px solid #667eea;

        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;

          .comment-author {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
            color: #2c3e50;

            i {
              color: #667eea;
              font-size: 16px;
            }
          }

          .comment-date {
            color: #7f8c8d;
            font-size: 12px;
          }

          .btn-delete-comment {
            background: none;
            border: none;
            color: #e74c3c;
            cursor: pointer;
            padding: 5px;
            border-radius: 4px;
            transition: all 0.3s ease;

            &:hover {
              background: rgba(231, 76, 60, 0.1);
            }
          }
        }

        .comment-content {
          line-height: 1.6;

          ::v-deep {
            p {
              margin: 0 0 10px 0;

              &:last-child {
                margin: 0;
              }
            }
          }
        }
      }
    }
  }
}

.modal-footer {
  padding: 20px 30px;
  border-top: 1px solid #eee;
  background: #f8f9fa;

  .footer-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .footer-info {
      .task-id {
        color: #95a5a6;
        font-size: 12px;
      }
    }
  }
}

// Buttons
.btn {
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.btn-primary {
    background: #667eea;
    color: white;

    &:hover:not(:disabled) {
      background: #5a6fd8;
      transform: translateY(-2px);
    }
  }

  &.btn-secondary {
    background: #95a5a6;
    color: white;

    &:hover:not(:disabled) {
      background: #7f8c8d;
    }
  }

  &.btn-danger {
    background: #e74c3c;
    color: white;

    &:hover:not(:disabled) {
      background: #c0392b;
      transform: translateY(-2px);
    }
  }
}

// Comment count badge
.comment-count {
  background: #667eea;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

// Responsive
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }

  .modal-container {
    max-height: 95vh;
  }

  .modal-header {
    padding: 20px;
    flex-direction: column;
    gap: 20px;

    .card-title-section {
      width: 100%;
    }

    .header-actions {
      width: 100%;
      flex-direction: row;
      justify-content: space-between;
    }
  }

  .modal-body {
    padding: 0 20px;
  }

  .modal-footer {
    padding: 15px 20px;

    .footer-actions {
      flex-direction: column;
      gap: 10px;
    }
  }
}
</style>
