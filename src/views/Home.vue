<template>
  <div class="view home">
    <div class="home-header">
      <h1 class="display-2">
        Vos catégories
      </h1>
      <p class="subtitle">
        Choisissez un tableau pour gérer vos tâches et projets
      </p>
    </div>
    <div v-if="loading" class="loading-section">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Chargement de vos tableaux...</p>
      </div>
    </div>
    <div v-if="!loading && !error" class="categories-grid">
      <div
        v-for="category in categories"
        :key="category.id"
        class="category-card"
        @click="openBoard(category)"
      >
        <div class="category-icon">
          <i class="fas fa-clipboard-list"></i>
        </div>
        <div class="category-info">
          <h3>{{ category.title }}</h3>
          <p v-if="category.description">{{ category.description }}</p>
          <p v-else class="no-description">Aucune description</p>
        </div>
        <div class="category-stats">
          <div class="stat-item">
            <i class="fas fa-sticky-note"></i>
            <span>{{ category.count || 0 }} cartes</span>
          </div>
        </div>
        <div class="category-actions" @click.stop>
          <button
            class="btn-icon btn-edit"
            @click="editCategory(category)"
            title="Modifier le tableau"
          >
            <i class="fas fa-edit"></i>
          </button>
          <button
            class="btn-icon btn-delete"
            @click="confirmDeleteCategory(category)"
            title="Supprimer le tableau"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <button
      v-if="!loading && !error"
      class="fab-create"
      @click="showCreateModal = true"
      title="Créer un nouveau tableau"
    >
      <i class="fas fa-plus"></i>
    </button>

    <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click="closeModals">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>
            <i class="fas fa-folder-plus"></i>
            {{ showEditModal ? 'Modifier le Tableau' : 'Nouveau Tableau' }}
          </h3>
          <button class="modal-close" @click="closeModals">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form @submit.prevent="submitCategory" class="modal-form">
          <div class="form-group">
            <label for="categoryTitle">Nom du tableau *</label>
            <input
              id="categoryTitle"
              type="text"
              v-model="categoryForm.title"
              placeholder="Ex: Projet Marketing, Développement Web..."
              required
              maxlength="50"
              ref="titleInput"
            />
          </div>

          <div class="form-group">
            <label for="categoryDescription">Description (optionnel)</label>
            <textarea
              id="categoryDescription"
              v-model="categoryForm.description"
              placeholder="Décrivez l'objectif de ce tableau"
              rows="3"
              maxlength="200"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeModals">
              Annuler
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="!categoryForm.title || submitting"
            >
              <i class="fas fa-spinner fa-spin" v-if="submitting"></i>
              <i class="fas fa-save" v-else></i>
              {{ submitting ? 'Création...' : 'Créer le tableau' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import wordpressAPI from '../services/wordpressApi.js';

export default {
  name: 'Home',

  data() {
    return {
      wordpressUrl: 'http://localhost/wordpress',
      loading: false,
      testing: false,
      submitting: false,
      error: null,
      connectionStatus: null,
      categories: [],
      showCreateModal: false,
      showEditModal: false,
      categoryForm: {
        id: null,
        title: '',
        description: '',
      },
      editingCategory: null,
    };
  },

  async mounted() {
    this.wordpressUrl = 'http://localhost/wordpress';
    wordpressAPI.setWordPressURL(this.wordpressUrl);
    localStorage.setItem('wordpress-url', this.wordpressUrl);
    await this.loadCategories();
  },

  methods: {
    updateWordPressUrl() {
      if (this.wordpressUrl) {
        wordpressAPI.setWordPressURL(this.wordpressUrl);
        localStorage.setItem('wordpress-url', this.wordpressUrl);
        this.connectionStatus = null;
      }
    },
    async testConnection() {
      if (!this.wordpressUrl) {
        this.connectionStatus = {
          type: 'error',
          icon: 'fas fa-times-circle',
          message: 'Veuillez saisir une URL WordPress',
        };
        return;
      }

      this.testing = true;
      this.connectionStatus = null;

      try {
        const result = await wordpressAPI.testConnection();
        if (result.success) {
          this.connectionStatus = {
            type: 'success',
            icon: 'fas fa-check-circle',
            message: 'Connexion WordPress réussie !',
          };
          await this.loadCategories();
        } else {
          this.connectionStatus = {
            type: 'error',
            icon: 'fas fa-times-circle',
            message: result.message || 'Erreur de connexion à WordPress',
          };
        }
      } catch (err) {
        this.connectionStatus = {
          type: 'error',
          icon: 'fas fa-times-circle',
          message: 'Impossible de se connecter à WordPress',
        };
        console.error('Erreur test connexion:', err);
      } finally {
        this.testing = false;
      }
    },
    async loadCategories() {
      this.loading = true;
      this.error = null;

      try {
        const result = await this.$ux.withLoading(() => wordpressAPI.getCategories(), {
          title: 'Chargement...',
          message: 'Récupération de vos tableaux depuis WordPress',
          minDelay: 300,
        });

        if (result.success) {
          this.categories = result.data.filter(cat => cat.id !== 1);
          if (this.categories.length === 0 && result.data.length > 0) {
            this.categories = result.data;
          }
        } else {
          this.error = result.error?.message || 'Erreur lors du chargement des tableaux';
          this.$toast.error(this.error, 'Erreur de chargement');
        }
      } catch (err) {
        this.error = 'Impossible de se connecter à WordPress. Vérifiez votre configuration.';
        this.$handleError(err, 'chargement des catégories');
      } finally {
        this.loading = false;
      }
    },
    openBoard(category) {
      this.$router.push({
        name: 'Board',
        params: {
          categoryId: category.id,
        },
        query: {
          categoryName: category.title,
        },
      });
    },
    editCategory(category) {
      this.editingCategory = category;
      this.categoryForm = {
        id: category.id,
        title: category.title,
        description: category.description || '',
      };
      this.showEditModal = true;
      this.$nextTick(() => {
        if (this.$refs.titleInput) {
          this.$refs.titleInput.focus();
        }
      });
    },
    async confirmDeleteCategory(category) {
      const confirmed = await this.$confirm.delete(`le tableau "${category.title}"`);
      if (confirmed) {
        await this.deleteCategory(category);
      }
    },

    async deleteCategory(category) {
      try {
        const result = await this.$ux.withLoading(() => wordpressAPI.deleteCategory(category.id), {
          title: 'Suppression...',
          message: `Suppression du tableau "${category.title}"`,
          type: 'pulse',
          variant: 'danger',
        });

        if (result.success) {
          this.categories = this.categories.filter(cat => cat.id !== category.id);
          await this.$ux.success(
            `Le tableau "${category.title}" a été supprimé`,
            'Tableau supprimé'
          );
        } else {
          this.$toast.error(result.error?.message || 'Erreur lors de la suppression', 'Erreur');
        }
      } catch (err) {
        this.$handleError(err, 'suppression du tableau');
      }
    },

    async submitCategory() {
      if (!this.categoryForm.title.trim()) {
        return;
      }

      this.submitting = true;

      try {
        let result;
        if (this.showEditModal) {
          result = await wordpressAPI.updateCategory(this.categoryForm.id, {
            title: this.categoryForm.title,
            name: this.generateSlug(this.categoryForm.title),
            description: this.categoryForm.description,
          });
        } else {
          result = await wordpressAPI.createCategory({
            title: this.categoryForm.title,
            name: this.generateSlug(this.categoryForm.title),
            description: this.categoryForm.description,
          });
        }
        if (result.success) {
          if (this.showEditModal) {
            const index = this.categories.findIndex(cat => cat.id === result.data.id);
            if (index !== -1) {
              this.categories.splice(index, 1, result.data);
            }
          } else {
            this.categories.push(result.data);
          }

          this.closeModals();
          this.$swal.fire({
            title: 'Succès !',
            text: `Tableau "${result.data.title}" ${
              this.showEditModal ? 'modifié' : 'créé'
            } avec succès !`,
            icon: 'success',
            timer: 3000,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
          });
          if (!this.showEditModal) {
            const openBoard = await this.$swal.fire({
              title: 'Tableau créé !',
              text: 'Voulez-vous ouvrir votre nouveau tableau maintenant ?',
              icon: 'success',
              showCancelButton: true,
              confirmButtonText: 'Ouvrir le tableau',
              cancelButtonText: 'Non',
            });

            if (openBoard.isConfirmed) {
              this.openBoard(result.data);
            }
          }
        } else {
          throw new Error(result.error?.message || "Erreur lors de l'enregistrement");
        }
      } catch (err) {
        this.$swal.fire({
          title: 'Erreur',
          text: `Impossible de sauvegarder le tableau : ${err.message}`,
          icon: 'error',
        });
        console.error('Erreur soumission catégorie:', err);
      } finally {
        this.submitting = false;
      }
    },
    generateSlug(title) {
      return title
        .toLowerCase()
        .trim()
        .replace(/[àáäâ]/g, 'a')
        .replace(/[èéëê]/g, 'e')
        .replace(/[ìíïî]/g, 'i')
        .replace(/[òóöô]/g, 'o')
        .replace(/[ùúüû]/g, 'u')
        .replace(/[ýÿ]/g, 'y')
        .replace(/[ç]/g, 'c')
        .replace(/[ñ]/g, 'n')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    },
    closeModals() {
      this.showCreateModal = false;
      this.showEditModal = false;
      this.editingCategory = null;
      this.resetForm();
    },
    resetForm() {
      this.categoryForm = {
        id: null,
        title: '',
        description: '',
      };
    },
    navigateTo(name) {
      this.$router.push({ name });
    },
  },
};
</script>

<style scoped>
.home {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.home-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 40px 0;
}

.home-header h1 {
  color: #2c3e50;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.home-header .subtitle {
  font-size: 18px;
  color: black;
  margin: 0;
}

.wordpress-config {
  margin-bottom: 40px;
}

.config-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.config-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  font-weight: 600;
  color: #495057;
}

.config-content {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.url-input {
  flex: 1;
  padding: 10px 15px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.url-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.btn-test {
  background: #17a2b8;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  min-width: 100px;
  justify-content: center;
}

.btn-test:hover:not(:disabled) {
  background: #138496;
  transform: translateY(-1px);
}

.btn-test:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.connection-status {
  padding: 10px;
  border-radius: 6px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.connection-status.success {
  background: #d4edda;
  color: #155724;
}

.connection-status.error {
  background: #f8d7da;
  color: #721c24;
}

/* Sections loading/error */
.loading-section,
.error-section {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.loading-spinner {
  text-align: center;
  color: #6c757d;
}

.loading-spinner i {
  font-size: 32px;
  margin-bottom: 15px;
}

.loading-spinner p {
  font-size: 16px;
  margin: 0;
}

.error-card {
  background: #f8d7da;
  color: #721c24;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  max-width: 400px;
}

.error-card i {
  font-size: 48px;
  margin-bottom: 20px;
}

.error-card h3 {
  margin: 0 0 15px 0;
}

.error-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  justify-content: center;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 25px;
  margin-bottom: 100px;
}

.category-card {
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 16px;
  padding: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.category-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.category-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  border-color: #007bff;
}

.category-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  margin-bottom: 20px;
}

.category-icon i {
  font-size: 24px;
  color: white;
}

.category-info h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 20px;
  font-weight: 600;
}

.category-info p {
  color: #6c757d;
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.no-description {
  font-style: italic;
  opacity: 0.7;
}

.category-stats {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e9ecef;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #495057;
}

.stat-item i {
  color: #007bff;
}

.category-actions {
  position: absolute;
  top: 15px;
  right: 15px;
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.2s;
}

.category-card:hover .category-actions {
  opacity: 1;
}

.btn-icon {
  background: rgba(255, 255, 255, 0.9);
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  color: #6c757d;
  backdrop-filter: blur(10px);
}

.btn-icon:hover {
  transform: scale(1.1);
}

.btn-edit:hover {
  background: #28a745;
  color: white;
}

.btn-delete:hover {
  background: #dc3545;
  color: white;
}

/* État vide */
.no-categories {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  padding: 60px 20px;
}

.empty-state {
  text-align: center;
  max-width: 400px;
}

.empty-state i {
  font-size: 80px;
  color: #e9ecef;
  margin-bottom: 30px;
}

.empty-state h3 {
  color: #495057;
  margin: 0 0 15px 0;
  font-size: 24px;
}

.empty-state p {
  color: #6c757d;
  margin: 0 0 30px 0;
  line-height: 1.6;
}

.btn-large {
  padding: 15px 30px;
  font-size: 16px;
  font-weight: 600;
}

.fab-create {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  z-index: 100;
}

.fab-create:hover {
  transform: scale(1.1) rotate(90deg);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-50px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: 25px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #2c3e50;
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #6c757d;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f8f9fa;
  color: #495057;
}

.modal-form {
  padding: 25px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  transition: all 0.2s;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding-top: 25px;
  border-top: 1px solid #e9ecef;
}

/* Styles des boutons */
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  text-decoration: none;
  justify-content: center;
  min-width: 120px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
  transform: translateY(-1px);
}
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
  .home {
    padding: 15px;
  }
  .categories-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .config-content {
    flex-direction: column;
  }
  .url-input {
    margin-bottom: 10px;
  }
  .fab-create {
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
  .modal-actions {
    flex-direction: column;
  }
  .btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .home-header h1 {
    flex-direction: column;
    gap: 10px;
  }
  .category-card {
    padding: 20px;
  }
  .modal-content {
    margin: 20px;
  }
}
</style>
