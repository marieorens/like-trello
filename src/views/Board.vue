<template>
  <div class="board-view view">
    <div class="board-header">
      <button class="btn-back" @click="$router.push('/')">
        <i class="fas fa-arrow-left"></i>
        Retour aux tableaux
      </button>

      <div class="board-title-section">
        <h1 class="display-3 text-uppercase text-center">
          {{ currentCategory ? currentCategory.title : 'Tableau' }}
        </h1>
        <p v-if="currentCategory" class="board-description">
          {{ currentCategory.description || 'Gérez vos tâches et projets' }}
        </p>
      </div>
    </div>

    <!-- Indicateur de chargement -->
    <div v-if="loading" class="loading-section">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Chargement du tableau...</p>
      </div>
    </div>

    <!-- Message d'erreur -->
    <div v-if="error" class="error-section">
      <div class="error-card">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Erreur de chargement</h3>
        <p>{{ error }}</p>
        <button class="btn btn-retry" @click="loadBoardData">
          <i class="fas fa-redo"></i>
          Réessayer
        </button>
      </div>
    </div>

    <!-- Tableau principal -->
    <main v-if="!loading && !error">
      <div class="board-columns">
        <!-- Colonne "À faire" -->
        <div class="board-column">
          <div class="column-header">
            <h3>
              <i class="fas fa-inbox"></i>
              À faire
            </h3>
            <span class="task-count">{{ todoTasks.length }}</span>
            <button class="btn-add" @click="addTask('todo')">
              <i class="fas fa-plus"></i>
            </button>
          </div>

          <Container
            group-name="wordpress-cards"
            class="drag-container"
            @drag-start="handleDragStart('todo', $event)"
            @drop="handleDrop('todo', $event)"
            :get-child-payload="getChildPayload"
            :drop-placeholder="{ className: 'drop-placeholder' }"
            drag-class="task-ghost"
            drop-class="task-ghost-drop"
          >
            <Draggable v-for="task in todoTasks" :key="task.id">
              <div class="task-card" @click="openTaskDetails(task)">
                <h4>{{ task.title }}</h4>
                <div class="task-meta">
                  <div class="task-actions">
                    <button @click.stop="editTask(task)" class="btn-edit">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button @click.stop="deleteTask(task.id)" class="btn-delete">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </Draggable>
          </Container>
        </div>
        <div class="board-column">
          <div class="column-header">
            <h3>
              <i class="fas fa-clock"></i>
              En cours
            </h3>
            <span class="task-count">{{ inProgressTasks.length }}</span>
            <button class="btn-add" @click="addTask('in-progress')">
              <i class="fas fa-plus"></i>
            </button>
          </div>

          <Container
            group-name="wordpress-cards"
            class="drag-container"
            @drag-start="handleDragStart('in-progress', $event)"
            @drop="handleDrop('in-progress', $event)"
            :get-child-payload="getChildPayload"
            :drop-placeholder="{ className: 'drop-placeholder' }"
            drag-class="task-ghost"
            drop-class="task-ghost-drop"
          >
            <Draggable v-for="(task, index) in inProgressTasks" :key="task.id">
              <div class="task-card" @click="openTaskDetails(task)">
                <h4>{{ task.title }}</h4>
                <div class="task-meta">
                  <div class="task-actions">
                    <button @click.stop="editTask(task)" class="btn-edit">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button @click.stop="deleteTask(task.id, index)" class="btn-delete">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </Draggable>
          </Container>
        </div>

        <!-- Colonne "Terminé" -->
        <div class="board-column">
          <div class="column-header">
            <h3>
              <i class="fas fa-check-circle"></i>
              Terminé
            </h3>
            <span class="task-count">{{ completedTasks.length }}</span>
            <button class="btn-add" @click="addTask('completed')">
              <i class="fas fa-plus"></i>
            </button>
          </div>

          <Container
            group-name="wordpress-cards"
            class="drag-container"
            @drag-start="handleDragStart('completed', $event)"
            @drop="handleDrop('completed', $event)"
            :get-child-payload="getChildPayload"
            :drop-placeholder="{ className: 'drop-placeholder' }"
            drag-class="task-ghost"
            drop-class="task-ghost-drop"
          >
            <Draggable v-for="(task, index) in completedTasks" :key="task.id">
              <div class="task-card completed" @click="openTaskDetails(task)">
                <h4>{{ task.title }}</h4>
                <div class="task-meta">
                  <div class="task-actions">
                    <button @click.stop="editTask(task)" class="btn-edit">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button @click.stop="deleteTask(task.id, index)" class="btn-delete">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </Draggable>
          </Container>
        </div>
      </div>
    </main>

    <CardDetails
      :isVisible="showCardDetails"
      :task="selectedTask"
      :categoryName="currentCategory ? currentCategory.name : ''"
      @close="closeCardDetails"
      @task-updated="handleTaskUpdated"
      @task-deleted="handleTaskDeleted"
      @status-changed="handleStatusChanged"
    />
  </div>
</template>

<script>
import { Container, Draggable } from 'vue-smooth-dnd';
import wordpressAPI from '../services/wordpressApi';
import CardDetails from '../components/CardDetails.vue';

export default {
  components: {
    Container,
    Draggable,
    CardDetails,
  },

  props: {
    categoryId: {
      type: [String, Number],
      required: true,
    },
  },

  async mounted() {
    await this.loadBoargodData();
    console.log('Mounted: todoTasks', this.todoTasks);
  },

  watch: {
    categoryId: {
      immediate: true,
      async handler(newCategoryId) {
        if (newCategoryId) {
          await this.loadBoardData();
        }
      },
    },
  },

  data() {
    return {
      currentCategory: null,
      posts: [],
      loading: false,
      error: null,

      draggingTask: {
        column: '',
        index: -1,
        taskData: null,
      },

      showCardDetails: false,
      selectedTask: null,
    };
  },

  computed: {
    todoTasks() {
      return this.posts.todo || [];
    },

    inProgressTasks() {
      return this.posts.inProgress || [];
    },

    completedTasks() {
      return this.posts.done || [];
    },
  },

  methods: {
    async loadBoardData() {
      this.loading = true;
      this.error = null;

      try {
        const data = await this.$ux.withLoading(
          async () => {
            let category = null;
            if (wordpressAPI && typeof wordpressAPI.getCategory === 'function') {
              const categoryResponse = await wordpressAPI.getCategory(this.categoryId);
              if (categoryResponse.success) {
                category = categoryResponse.data;
              }
            }
            const postsResponse = await wordpressAPI.getPosts(this.categoryId);
            if (!postsResponse.success) {
              throw new Error(
                postsResponse.error.message || 'Erreur lors de la récupération des posts'
              );
            }
            const posts = postsResponse.data;
            return { category, posts };
          },
          {
            title: 'Chargement du tableau...',
            message: 'Récupération des tâches depuis WordPress',
            type: 'ring',
          }
        );

        this.currentCategory = data.category;

        const groupedPosts = {
          todo: [],
          inProgress: [],
          done: [],
        };

        data.posts.forEach(post => {
          const status = post.meta?.task_status || 'todo';
          if (groupedPosts[status]) {
            groupedPosts[status].push(post);
          }
        });

        this.posts = groupedPosts;

        const taskCount = data.posts.length;
        if (taskCount > 0) {
          this.$toast.info(
            `${taskCount} tâche${taskCount > 1 ? 's' : ''} trouvée${taskCount > 1 ? 's' : ''}`,
            `Tableau "${this.currentCategory ? this.currentCategory.title : 'Sans nom'}"`
          );
        }
      } catch (error) {
        this.error = `Impossible de charger le tableau: ${error.message}`;
        this.$handleError(error, 'chargement du tableau');
      } finally {
        this.loading = false;
      }
    },

    getTaskStatus(post) {
      // Utiliser les méta-données ou tags WordPress pour déterminer le statut
      // Par défaut, tous les nouveaux posts sont "todo"
      if (post.meta && post.meta.task_status) {
        return post.meta.task_status;
      }

      // Fallback: utiliser le statut WordPress
      if (post.status === 'draft') return 'todo';
      if (post.status === 'pending') return 'in-progress';
      if (post.status === 'publish') return 'completed';

      return 'todo';
    },

    async updateTaskStatus(postId, newStatus) {
      try {
        const post = this.posts.find(p => p.id === postId);
        const response = await wordpressAPI.updatePost(postId, {
          meta: {
            task_status: newStatus,
          },
          categories: post && post.categoryId ? [post.categoryId] : undefined,
        });
        if (!response.success) {
          throw new Error(response.error.message || 'Erreur lors de la mise à jour');
        }
        if (post) {
          if (!post.meta) post.meta = {};
          post.meta.task_status = newStatus;
        }
      } catch (error) {
        this.$swal.fire('Erreur', 'Impossible de mettre à jour le statut de la tâche', 'error');
      }
    },

    handleDragStart(column, dragResult) {
      const { payload, isSource } = dragResult;
      if (isSource) {
        let taskData;

        if (column === 'todo') {
          taskData = this.todoTasks[payload.index];
        } else if (column === 'in-progress') {
          taskData = this.inProgressTasks[payload.index];
        } else if (column === 'completed') {
          taskData = this.completedTasks[payload.index];
        }

        this.draggingTask = {
          column: column,
          index: payload.index,
          taskData: taskData,
        };
      }
    },

    async handleDrop(targetColumn, dropResult) {
      const { removedIndex, addedIndex } = dropResult;
      const { taskData } = this.draggingTask;

      if (!taskData) return;

      if (targetColumn === this.draggingTask.column && removedIndex === addedIndex) {
        return;
      }

      try {
        await this.updateTaskStatus(taskData.id, targetColumn);
        await this.loadBoardData();
      } catch (error) {
        console.error('Erreur lors du déplacement de la tâche:', error);
        this.$swal.fire('Erreur', 'Impossible de déplacer la tâche', 'error');
      }
    },

    getChildPayload(index) {
      return { index };
    },

    async deleteTask(postId) {
      const taskToDelete = this.posts.find(p => p.id === postId);
      const confirmed = await this.$confirm.delete(
        `la tâche "${taskToDelete?.title.rendered || 'cette tâche'}"`
      );

      if (confirmed) {
        try {
          const deleteResponse = await this.$ux.withLoading(() => wordpressAPI.deletePost(postId), {
            title: 'Suppression...',
            message: 'Suppression de la tâche en cours',
            type: 'pulse',
            variant: 'danger',
          });

          if (!deleteResponse.success) {
            throw new Error(deleteResponse.error.message || 'Erreur lors de la suppression');
          }

          // Retirer de la liste locale
          this.posts = this.posts.filter(post => post.id !== postId);

          await this.$ux.success('La tâche a été supprimée avec succès', 'Tâche supprimée');
        } catch (error) {
          this.$handleError(error, 'suppression de la tâche');
        }
      }
    },

    async addTask(column) {
      const { value: formData } = await this.$swal.fire({
        title: 'Créer une nouvelle tâche',
        html: `
          <div style="text-align: left;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Titre de la tâche:</label>
            <input id="task-title" class="swal2-input" placeholder="Titre de la tâche" style="margin-bottom: 15px;">
            
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Description (optionnelle):</label>
            <textarea id="task-description" class="swal2-textarea" placeholder="Description de la tâche..." style="height: 100px;"></textarea>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Créer la tâche',
        cancelButtonText: 'Annuler',
        reverseButtons: true,
        preConfirm: () => {
          const title = document.getElementById('task-title').value;
          const description = document.getElementById('task-description').value;

          if (!title.trim()) {
            this.$swal.showValidationMessage('Le titre est obligatoire');
            return false;
          }

          return { title: title.trim(), description: description.trim() };
        },
      });

      if (formData) {
        try {
          const createResponse = await this.$ux.withLoading(
            () =>
              wordpressAPI.createPost({
                title: formData.title,
                content: formData.description,
                categoryId: this.categoryId,
                status: 'draft',
                meta: {
                  task_status: column,
                },
              }),
            {
              title: 'Création...',
              message: 'Création de la nouvelle tâche',
              type: 'dots',
              variant: 'success',
            }
          );
          if (!createResponse.success) {
            throw new Error(createResponse.error.message || 'Erreur lors de la création');
          }

          // Ajouter directement la tâche à la liste locale
          const newTask = {
            id: createResponse.data.id,
            title: createResponse.data.title,
            content: createResponse.data.content,
            meta: createResponse.data.meta,
          };
          this.posts[column].push(newTask);

          await this.$ux.success(`La tâche "${formData.title}" a été créée`, 'Nouvelle tâche');
        } catch (error) {
          this.$handleError(error, 'création de la tâche');
        }
      }
    },

    async editTask(task) {
      const { value: formData } = await this.$swal.fire({
        title: 'Modifier la tâche',
        html: `
          <div style="text-align: left;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Titre de la tâche:</label>
            <input id="task-title" class="swal2-input" value="${
              task.title.rendered
            }" style="margin-bottom: 15px;">
            
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Description:</label>
            <textarea id="task-description" class="swal2-textarea" style="height: 100px;">${task.content.rendered.replace(
              /<[^>]*>/g,
              ''
            )}</textarea>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Sauvegarder',
        cancelButtonText: 'Annuler',
        reverseButtons: true,
        preConfirm: () => {
          const title = document.getElementById('task-title').value;
          const description = document.getElementById('task-description').value;
          if (!title.trim()) {
            this.$swal.showValidationMessage('Le titre est obligatoire');
            return false;
          }

          return { title: title.trim(), description: description.trim() };
        },
      });

      if (formData) {
        try {
          const updateResponse = await wordpressAPI.updatePost(task.id, {
            title: formData.title,
            content: formData.description,
          });

          if (!updateResponse.success) {
            throw new Error(updateResponse.error.message || 'Erreur lors de la mise à jour');
          }

          // Mettre à jour localement
          const index = this.posts.findIndex(p => p.id === task.id);
          if (index !== -1) {
            this.posts.splice(index, 1, updateResponse.data);
          }

          this.$swal.fire('Modifié!', 'La tâche a été mise à jour.', 'success');
        } catch (error) {
          console.error('Erreur lors de la modification:', error);
          this.$swal.fire('Erreur', 'Impossible de modifier la tâche', 'error');
        }
      }
    },

    openTaskDetails(task) {
      this.selectedTask = task;
      this.showCardDetails = true;
    },

    closeCardDetails() {
      this.showCardDetails = false;
      this.selectedTask = null;
    },

    handleTaskUpdated(updatedTask) {
      const index = this.posts.findIndex(p => p.id === updatedTask.id);
      if (index !== -1) {
        this.posts.splice(index, 1, updatedTask);
      }
    },

    handleTaskDeleted(taskId) {
      this.posts = this.posts.filter(post => post.id !== taskId);
    },

    async handleStatusChanged() {
      await this.loadBoardData();
    },

    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    },
  },
};
</script>

<style lang="scss" scoped>
@import '../assets/styles/_variables.scss';

.board-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;

  .board-header {
    margin-bottom: 30px;

    .btn-back {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 10px 20px;
      border-radius: 25px;
      cursor: pointer;
      font-size: 14px;
      margin-bottom: 20px;
      transition: all 0.3s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }

      i {
        margin-right: 8px;
      }
    }

    .board-title-section {
      text-align: center;
      color: white;

      h1 {
        margin-bottom: 10px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      .board-description {
        font-size: 18px;
        opacity: 0.9;
        margin: 0;
      }
    }
  }

  .loading-section,
  .error-section {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;

    .loading-spinner,
    .error-card {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      text-align: center;
      max-width: 400px;

      i {
        font-size: 48px;
        margin-bottom: 20px;

        &.fa-spinner {
          color: #667eea;
        }

        &.fa-exclamation-triangle {
          color: #e74c3c;
        }
      }

      h3 {
        color: #2c3e50;
        margin-bottom: 15px;
      }

      p {
        color: #7f8c8d;
        margin-bottom: 20px;
      }

      .btn-retry {
        background: #667eea;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 25px;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.3s ease;

        &:hover {
          background: #5a6fd8;
          transform: translateY(-2px);
        }

        i {
          margin-right: 8px;
          font-size: 16px;
        }
      }
    }
  }

  .board-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 30px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .board-column {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    padding: 20px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    min-height: 500px;

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #ecf0f1;

      h3 {
        margin: 0;
        color: #2c3e50;
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;

        i {
          font-size: 20px;

          &.fa-inbox {
            color: #3498db;
          }
          &.fa-clock {
            color: #f39c12;
          }
          &.fa-check-circle {
            color: #27ae60;
          }
        }
      }

      .task-count {
        background: #95a5a6;
        color: white;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 12px;
        font-weight: 600;
      }

      .btn-add {
        background: #667eea;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          background: #5a6fd8;
          transform: scale(1.1);
        }

        i {
          font-size: 14px;
        }
      }
    }

    .drag-container {
      min-height: 400px;

      .drop-placeholder {
        background: #ddd;
        border: 2px dashed #bbb;
        margin: 10px 0;
        border-radius: 10px;
        height: 80px;
        opacity: 0.5;
      }
    }

    .task-card {
      background: white;
      border-radius: 10px;
      padding: 15px;
      margin-bottom: 15px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.3s ease;
      border-left: 4px solid #3498db;

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
      }

      &.completed {
        border-left-color: #27ae60;
        opacity: 0.8;

        h4 {
          text-decoration: line-through;
          color: #7f8c8d;
        }
      }

      h4 {
        margin: 0 0 10px 0;
        color: #2c3e50;
        font-size: 16px;
        font-weight: 600;
        line-height: 1.4;
      }

      .task-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;

        .task-date {
          color: #7f8c8d;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 5px;

          i {
            font-size: 11px;
          }
        }

        .task-actions {
          display: flex;
          gap: 5px;

          button {
            background: none;
            border: none;
            padding: 5px;
            cursor: pointer;
            border-radius: 5px;
            transition: all 0.3s ease;
            font-size: 12px;

            &.btn-edit {
              color: #f39c12;

              &:hover {
                background: rgba(243, 156, 18, 0.1);
              }
            }

            &.btn-delete {
              color: #e74c3c;

              &:hover {
                background: rgba(231, 76, 60, 0.1);
              }
            }
          }
        }
      }
    }
  }
}

// Styles pour le drag & drop
.task-ghost {
  transition: transform 0.18s ease;
  transform: rotateZ(5deg);
}

.task-ghost-drop {
  transition: transform 0.18s ease-in-out;
  transform: rotateZ(0deg);
}

// Responsive
@media (max-width: 768px) {
  .board-view {
    padding: 15px;

    .board-columns {
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .board-column {
      padding: 15px;
    }
  }
}
</style>
