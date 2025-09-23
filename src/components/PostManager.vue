<template>
  <div class="post-manager">
    <div class="post-header">
      <h2>Gestion des Cartes (Articles WordPress)</h2>
      <div class="header-actions">
        <div class="filter-section">
          <select v-model="selectedCategoryFilter" @change="loadPosts" :disabled="loading">
            <option value="">Toutes les colonnes</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.title }}
            </option>
          </select>
        </div>
        <button class="btn btn-primary" @click="showCreateModal = true" :disabled="loading">
          <i class="fas fa-plus"></i> Nouvelle Carte
        </button>
        <button class="btn btn-secondary" @click="refreshData" :disabled="loading">
          <i class="fas fa-sync"></i> Actualiser
        </button>
      </div>
    </div>

    <div v-if="!loading && posts.length > 0" class="post-stats">
      <div class="stat-item">
        <i class="fas fa-sticky-note"></i>
        <span>{{ filteredPosts.length }} cartes affichées</span>
      </div>
      <div class="stat-item">
        <i class="fas fa-folder"></i>
        <span>{{ categories.length }} colonnes</span>
      </div>
    </div>

    <div v-if="loading" class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i> Chargement des cartes...
    </div>

    <div v-if="error" class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      {{ error }}
      <button class="btn btn-sm" @click="error = null">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div v-if="!loading && viewMode === 'columns'" class="posts-columns">
      <div v-for="category in categoriesWithPosts" :key="category.id" class="column">
        <div class="column-header">
          <h3>{{ category.title }}</h3>
          <span class="post-count">{{ category.posts.length }}</span>
        </div>
        <div class="column-posts">
          <div
            v-for="post in category.posts"
            :key="post.id"
            class="post-card"
            @click="viewPost(post)"
          >
            <div class="post-content">
              <h4>{{ post.title }}</h4>
              <p v-if="post.excerpt" class="post-excerpt" v-html="post.excerpt"></p>
              <div class="post-meta">
                <span class="post-date">{{ formatDate(post.date) }}</span>
              </div>
            </div>
            <div class="post-actions">
              <button
                class="btn-icon btn-edit"
                @click.stop="editPost(post)"
                :disabled="loading"
                title="Modifier"
              >
                <i class="fas fa-edit"></i>
              </button>
              <button
                class="btn-icon btn-delete"
                @click.stop="confirmDeletePost(post)"
                :disabled="loading"
                title="Supprimer"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <button class="add-card-btn" @click="openCreateModal(category.id)" :disabled="loading">
            <i class="fas fa-plus"></i> Ajouter une carte
          </button>
        </div>
      </div>

      <div v-if="categoriesWithPosts.length === 0" class="no-data">
        <i class="fas fa-columns"></i>
        <p>Aucune colonne disponible</p>
        <p>Créez d'abord des catégories dans WordPress</p>
      </div>
    </div>

    <div v-if="!loading && viewMode === 'list'" class="posts-list">
      <div class="list-header">
        <div class="list-controls">
          <button
            class="btn btn-sm"
            :class="{ 'btn-primary': viewMode === 'list', 'btn-secondary': viewMode !== 'list' }"
            @click="viewMode = 'list'"
          >
            <i class="fas fa-list"></i> Liste
          </button>
          <button
            class="btn btn-sm"
            :class="{
              'btn-primary': viewMode === 'columns',
              'btn-secondary': viewMode !== 'columns',
            }"
            @click="viewMode = 'columns'"
          >
            <i class="fas fa-columns"></i> Colonnes
          </button>
        </div>
      </div>

      <div class="posts-table">
        <div class="table-row table-header">
          <div class="col-title">Titre</div>
          <div class="col-category">Colonne</div>
          <div class="col-date">Date</div>
          <div class="col-actions">Actions</div>
        </div>

        <div v-for="post in filteredPosts" :key="post.id" class="table-row" @click="viewPost(post)">
          <div class="col-title">
            <strong>{{ post.title }}</strong>
            <p v-if="post.excerpt" v-html="post.excerpt.substring(0, 100) + '...'"></p>
          </div>
          <div class="col-category">
            <span class="category-badge">{{ getCategoryName(post.categoryId) }}</span>
          </div>
          <div class="col-date">{{ formatDate(post.date) }}</div>
          <div class="col-actions" @click.stop>
            <button class="btn-icon btn-edit" @click="editPost(post)" title="Modifier">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon btn-delete" @click="confirmDeletePost(post)" title="Supprimer">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Boutons de vue (affiché seulement avec des données) -->
    <div v-if="!loading && posts.length > 0" class="view-toggles">
      <button
        class="btn btn-sm"
        :class="{ 'btn-primary': viewMode === 'columns', 'btn-secondary': viewMode !== 'columns' }"
        @click="viewMode = 'columns'"
      >
        <i class="fas fa-columns"></i> Colonnes
      </button>
      <button
        class="btn btn-sm"
        :class="{ 'btn-primary': viewMode === 'list', 'btn-secondary': viewMode !== 'list' }"
        @click="viewMode = 'list'"
      >
        <i class="fas fa-list"></i> Liste
      </button>
    </div>

    <!-- Modal de création/édition -->
    <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click="closeModals">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>
            <i class="fas fa-sticky-note"></i>
            {{ showEditModal ? 'Modifier la Carte' : 'Nouvelle Carte' }}
          </h3>
          <button class="modal-close" @click="closeModals">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form @submit.prevent="submitPost" class="modal-form">
          <div class="form-group">
            <label for="postTitle">Titre de la carte *</label>
            <input
              id="postTitle"
              type="text"
              v-model="postForm.title"
              placeholder="Titre de votre carte"
              required
              maxlength="100"
            />
          </div>

          <div class="form-group">
            <label for="postCategory">Colonne *</label>
            <select id="postCategory" v-model="postForm.categoryId" required>
              <option value="">Choisir une colonne</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.title }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="postExcerpt">Description courte</label>
            <textarea
              id="postExcerpt"
              v-model="postForm.excerpt"
              placeholder="Description rapide de la carte"
              rows="3"
              maxlength="300"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="postContent">Contenu détaillé</label>
            <textarea
              id="postContent"
              v-model="postForm.content"
              placeholder="Contenu complet de la carte"
              rows="6"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeModals">
              Annuler
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="!postForm.title || !postForm.categoryId || submitting"
            >
              <i class="fas fa-spinner fa-spin" v-if="submitting"></i>
              <i class="fas fa-save" v-else></i>
              {{ submitting ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de visualisation -->
    <div v-if="showViewModal && selectedPost" class="modal-overlay" @click="showViewModal = false">
      <div class="modal-content modal-large" @click.stop>
        <div class="modal-header">
          <h3>
            <i class="fas fa-eye"></i>
            {{ selectedPost.title }}
          </h3>
          <div class="modal-header-actions">
            <button class="btn btn-sm btn-edit" @click="editPost(selectedPost)">
              <i class="fas fa-edit"></i> Modifier
            </button>
            <button class="modal-close" @click="showViewModal = false">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div class="modal-body">
          <div class="post-meta-full">
            <span class="category-badge">{{ getCategoryName(selectedPost.categoryId) }}</span>
            <span class="post-date-full">{{ formatDate(selectedPost.date) }}</span>
          </div>

          <div
            v-if="selectedPost.excerpt"
            class="post-excerpt-full"
            v-html="selectedPost.excerpt"
          ></div>
          <div
            v-if="selectedPost.content"
            class="post-content-full"
            v-html="selectedPost.content"
          ></div>

          <div v-if="!selectedPost.excerpt && !selectedPost.content" class="no-content">
            <i class="fas fa-file-alt"></i>
            <p>Aucun contenu pour cette carte</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import wordpressAPI from '../services/wordpressApi.js';

export default {
  name: 'PostManager',

  props: {
    categories: {
      type: Array,
      default: () => [],
    },
  },

  data() {
    return {
      // États de l'interface
      loading: false,
      submitting: false,
      error: null,
      viewMode: 'columns', // 'columns' ou 'list'

      // Données des articles
      posts: [],

      // Filtres
      selectedCategoryFilter: '',

      // Modals
      showCreateModal: false,
      showEditModal: false,
      showViewModal: false,

      // Article sélectionné pour visualisation
      selectedPost: null,

      // Formulaire d'article
      postForm: {
        id: null,
        title: '',
        content: '',
        excerpt: '',
        categoryId: null,
      },

      // Article en cours d'édition
      editingPost: null,
    };
  },

  computed: {
    /**
     * Articles filtrés selon la catégorie sélectionnée
     */
    filteredPosts() {
      if (!this.selectedCategoryFilter) {
        return this.posts;
      }
      return this.posts.filter(post => post.categoryId === parseInt(this.selectedCategoryFilter));
    },

    /**
     * Catégories avec leurs articles pour la vue en colonnes
     */
    categoriesWithPosts() {
      return this.categories.map(category => ({
        ...category,
        posts: this.posts.filter(post => post.categoryId === category.id),
      }));
    },
  },

  watch: {
    // Rechargement quand les catégories changent
    categories: {
      handler() {
        this.loadPosts();
      },
      immediate: true,
    },
  },

  async mounted() {
    await this.loadPosts();
  },

  methods: {
    /**
     * Charge tous les articles depuis WordPress
     */
    async loadPosts() {
      if (this.categories.length === 0) {
        return; // Attendre que les catégories soient chargées
      }

      this.loading = true;
      this.error = null;

      try {
        const categoryId = this.selectedCategoryFilter || null;
        const result = await wordpressAPI.getPosts(categoryId);

        if (result.success) {
          this.posts = result.data;
          this.$emit('posts-loaded', result.data);
        } else {
          this.error = result.error?.message || 'Erreur lors du chargement des articles';
        }
      } catch (err) {
        this.error = 'Impossible de se connecter à WordPress';
        console.error('Erreur chargement articles:', err);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Actualise les données (catégories et articles)
     */
    async refreshData() {
      this.$emit('refresh-categories');
      await this.loadPosts();
    },

    /**
     * Ouvre le modal de création avec une catégorie pré-sélectionnée
     */
    openCreateModal(categoryId = null) {
      this.postForm.categoryId = categoryId;
      this.showCreateModal = true;
    },

    /**
     * Ouvre le modal d'édition pour un article
     */
    editPost(post) {
      this.editingPost = post;
      this.postForm = {
        id: post.id,
        title: post.title,
        content: post.content || '',
        excerpt: post.excerpt || '',
        categoryId: post.categoryId,
      };
      this.showEditModal = true;
      this.showViewModal = false; // Fermer la vue si ouverte
    },

    /**
     * Affiche les détails d'un article
     */
    viewPost(post) {
      this.selectedPost = post;
      this.showViewModal = true;
    },

    /**
     * Confirme la suppression d'un article
     */
    async confirmDeletePost(post) {
      const confirmed = await this.$swal.fire({
        title: 'Supprimer la carte ?',
        text: `La carte "${post.title}" sera supprimée définitivement.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Oui, supprimer',
        cancelButtonText: 'Annuler',
        reverseButtons: true,
      });

      if (confirmed.isConfirmed) {
        await this.deletePost(post);
      }
    },

    /**
     * Supprime un article
     */
    async deletePost(post) {
      this.loading = true;

      try {
        const result = await wordpressAPI.deletePost(post.id);

        if (result.success) {
          this.posts = this.posts.filter(p => p.id !== post.id);
          this.$emit('post-deleted', post);

          this.$swal.fire({
            title: 'Supprimé !',
            text: `La carte "${post.title}" a été supprimée.`,
            icon: 'success',
            timer: 3000,
          });
        } else {
          throw new Error(result.error?.message || 'Erreur lors de la suppression');
        }
      } catch (err) {
        this.error = err.message;
        console.error('Erreur suppression article:', err);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Soumet le formulaire d'article (création ou édition)
     */
    async submitPost() {
      if (!this.postForm.title.trim() || !this.postForm.categoryId) {
        return;
      }

      this.submitting = true;

      try {
        let result;

        if (this.showEditModal) {
          // Mise à jour
          result = await wordpressAPI.updatePost(this.postForm.id, this.postForm);
        } else {
          // Création
          result = await wordpressAPI.createPost(this.postForm);
        }

        if (result.success) {
          if (this.showEditModal) {
            // Mettre à jour dans la liste
            const index = this.posts.findIndex(post => post.id === result.data.id);
            if (index !== -1) {
              this.posts.splice(index, 1, result.data);
            }
            this.$emit('post-updated', result.data);
          } else {
            // Ajouter à la liste
            this.posts.push(result.data);
            this.$emit('post-created', result.data);
          }

          this.closeModals();

          this.$swal.fire({
            title: 'Succès !',
            text: `Carte "${result.data.title}" ${
              this.showEditModal ? 'modifiée' : 'créée'
            } avec succès.`,
            icon: 'success',
            timer: 3000,
          });
        } else {
          throw new Error(result.error?.message || "Erreur lors de l'enregistrement");
        }
      } catch (err) {
        this.error = err.message;
        console.error('Erreur soumission article:', err);
      } finally {
        this.submitting = false;
      }
    },

    /**
     * Ferme tous les modals
     */
    closeModals() {
      this.showCreateModal = false;
      this.showEditModal = false;
      this.showViewModal = false;
      this.editingPost = null;
      this.selectedPost = null;
      this.resetForm();
    },

    /**
     * Remet à zéro le formulaire
     */
    resetForm() {
      this.postForm = {
        id: null,
        title: '',
        content: '',
        excerpt: '',
        categoryId: null,
      };
    },

    /**
     * Retourne le nom d'une catégorie par son ID
     */
    getCategoryName(categoryId) {
      const category = this.categories.find(cat => cat.id === categoryId);
      return category ? category.title : 'Sans colonne';
    },

    /**
     * Formate une date
     */
    formatDate(dateString) {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    },
  },
};
</script>

<style scoped>
/* Styles similaires au CategoryManager avec adaptations pour PostManager */
.post-manager {
  padding: 20px;
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.post-header h2 {
  margin: 0;
  color: #333;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-section select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.post-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: #666;
}

/* Vue en colonnes style Trello */
.posts-columns {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding-bottom: 20px;
}

.column {
  min-width: 300px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #dee2e6;
}

.column-header h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.post-count {
  background: #007bff;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.column-posts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.post-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.post-content h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.post-excerpt {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  margin: 0 0 8px 0;
}

.post-meta {
  font-size: 11px;
  color: #999;
}

.post-actions {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.2s;
}

.post-card:hover .post-actions {
  opacity: 1;
}

.btn-icon {
  background: none;
  border: none;
  padding: 4px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.1);
}

.btn-edit {
  color: #28a745;
}

.btn-delete {
  color: #dc3545;
}

.add-card-btn {
  background: none;
  border: 2px dashed #ccc;
  border-radius: 6px;
  padding: 15px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.add-card-btn:hover {
  border-color: #007bff;
  color: #007bff;
  background: rgba(0, 123, 255, 0.05);
}

/* Vue en liste */
.posts-list {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.posts-table {
  width: 100%;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 150px 150px 100px;
  gap: 15px;
  padding: 15px;
  border-bottom: 1px solid #eee;
  align-items: center;
  cursor: pointer;
  transition: background 0.2s;
}

.table-row:hover:not(.table-header) {
  background: #f8f9fa;
}

.table-header {
  background: #e9ecef;
  font-weight: 600;
  cursor: default;
}

.col-title strong {
  display: block;
  margin-bottom: 4px;
}

.col-title p {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.category-badge {
  background: #007bff;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.col-actions {
  display: flex;
  gap: 5px;
  justify-content: center;
}

/* Boutons de vue */
.view-toggles {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 5px;
  background: white;
  padding: 5px;
  border-radius: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Modal styles (réutilise les styles du CategoryManager) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-large {
  max-width: 800px;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #999;
  padding: 5px;
}

.modal-form {
  padding: 20px;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.post-meta-full {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.post-date-full {
  font-size: 14px;
  color: #666;
}

.post-excerpt-full {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-left: 4px solid #007bff;
  border-radius: 4px;
}

.post-content-full {
  line-height: 1.6;
}

.no-content {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-content i {
  font-size: 48px;
  margin-bottom: 20px;
  color: #ddd;
}

.no-data {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.no-data i {
  font-size: 48px;
  margin-bottom: 20px;
  color: #ddd;
}

/* Boutons et styles communs */
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

.loading-spinner {
  text-align: center;
  padding: 40px;
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
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid #eee;
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
  .posts-columns {
    flex-direction: column;
  }

  .column {
    min-width: auto;
  }

  .table-row {
    grid-template-columns: 1fr 100px 80px 60px;
    gap: 10px;
    font-size: 12px;
  }

  .view-toggles {
    bottom: 10px;
    right: 10px;
  }
}
</style>
