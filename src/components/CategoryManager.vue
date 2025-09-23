<template>
  <div class="category-manager">
    <div class="category-header">
      <h2>Gestion des Colonnes (Catégories WordPress)</h2>
      <div class="header-actions">
        <button class="btn btn-primary" @click="showCreateModal = true" :disabled="loading">
          <i class="fas fa-plus"></i> Nouvelle Colonne
        </button>
        <button class="btn btn-secondary" @click="loadCategories" :disabled="loading">
          <i class="fas fa-sync"></i> Actualiser
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i> Chargement des catégories...
    </div>

    <div v-if="error" class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      {{ error }}
      <button class="btn btn-sm" @click="error = null">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div v-if="!loading" class="categories-grid">
      <div v-for="category in categories" :key="category.id" class="category-card">
        <div class="category-content">
          <h3>{{ category.title }}</h3>
          <p class="category-description">{{ category.description || 'Aucune description' }}</p>
          <span class="category-count">{{ category.count }} article(s)</span>
        </div>
        <div class="category-actions">
          <button class="btn btn-sm btn-edit" @click="editCategory(category)" :disabled="loading">
            <i class="fas fa-edit"></i>
          </button>
          <button
            class="btn btn-sm btn-delete"
            @click="confirmDelete(category)"
            :disabled="loading"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>

      <div v-if="categories.length === 0" class="no-categories">
        <i class="fas fa-folder-open"></i>
        <p>Aucune catégorie trouvée</p>
        <p>Créez votre première colonne pour commencer</p>
      </div>
    </div>

    <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click="closeModals">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>
            <i class="fas fa-folder"></i>
            {{ showEditModal ? 'Modifier la Colonne' : 'Nouvelle Colonne' }}
          </h3>
          <button class="modal-close" @click="closeModals">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form @submit.prevent="submitCategory" class="modal-form">
          <div class="form-group">
            <label for="categoryTitle">Nom de la colonne *</label>
            <input
              id="categoryTitle"
              type="text"
              v-model="categoryForm.title"
              placeholder="Ex: À faire, En cours, Terminé"
              required
              maxlength="50"
            />
          </div>

          <div class="form-group">
            <label for="categoryName">Slug (généré automatiquement)</label>
            <input
              id="categoryName"
              type="text"
              v-model="categoryForm.name"
              placeholder="Généré automatiquement"
              readonly
            />
          </div>

          <div class="form-group">
            <label for="categoryDescription">Description (optionnel)</label>
            <textarea
              id="categoryDescription"
              v-model="categoryForm.description"
              placeholder="Description de cette colonne"
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
              {{ submitting ? 'Enregistrement...' : 'Enregistrer' }}
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
  name: 'CategoryManager',

  data() {
    return {
      loading: false,
      submitting: false,
      error: null,

      categories: [],

      showCreateModal: false,
      showEditModal: false,

      categoryForm: {
        id: null,
        title: '',
        name: '',
        description: '',
      },

      editingCategory: null,
    };
  },

  watch: {
    'categoryForm.title'(newTitle) {
      if (!this.showEditModal) {
        this.categoryForm.name = this.generateSlug(newTitle);
      }
    },
  },

  async mounted() {
    await this.loadCategories();
  },

  methods: {
    async loadCategories() {
      this.loading = true;
      this.error = null;

      try {
        const result = await wordpressAPI.getCategories();

        if (result.success) {
          this.categories = result.data;
          this.$emit('categories-loaded', result.data);
        } else {
          this.error = result.error?.message || 'Erreur lors du chargement des catégories';
        }
      } catch (err) {
        this.error = 'Impossible de se connecter à WordPress';
        console.error('Erreur chargement catégories:', err);
      } finally {
        this.loading = false;
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

    editCategory(category) {
      this.editingCategory = category;
      this.categoryForm = {
        id: category.id,
        title: category.title,
        name: category.name,
        description: category.description || '',
      };
      this.showEditModal = true;
    },

    async confirmDelete(category) {
      const confirmed = await this.$swal.fire({
        title: 'Supprimer la colonne ?',
        text: `La colonne "${category.title}" et tous ses articles seront supprimés définitivement.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Oui, supprimer',
        cancelButtonText: 'Annuler',
        reverseButtons: true,
      });

      if (confirmed.isConfirmed) {
        await this.deleteCategory(category);
      }
    },

    /**
     * Supprime une catégorie
     */
    async deleteCategory(category) {
      this.loading = true;

      try {
        const result = await wordpressAPI.deleteCategory(category.id);

        if (result.success) {
          this.categories = this.categories.filter(cat => cat.id !== category.id);
          this.$emit('category-deleted', category);

          this.$swal.fire({
            title: 'Supprimé !',
            text: `La colonne "${category.title}" a été supprimée.`,
            icon: 'success',
            timer: 3000,
          });
        } else {
          throw new Error(result.error?.message || 'Erreur lors de la suppression');
        }
      } catch (err) {
        this.error = err.message;
        console.error('Erreur suppression catégorie:', err);
      } finally {
        this.loading = false;
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
          result = await wordpressAPI.updateCategory(this.categoryForm.id, this.categoryForm);
        } else {
          result = await wordpressAPI.createCategory(this.categoryForm);
        }

        if (result.success) {
          if (this.showEditModal) {
            // Mettre à jour dans la liste
            const index = this.categories.findIndex(cat => cat.id === result.data.id);
            if (index !== -1) {
              this.categories.splice(index, 1, result.data);
            }
            this.$emit('category-updated', result.data);
          } else {
            this.categories.push(result.data);
            this.$emit('category-created', result.data);
          }

          this.closeModals();
          this.$swal.fire({
            title: 'Succès !',
            text: `Colonne "${result.data.title}" ${
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
        console.error('Erreur soumission catégorie:', err);
      } finally {
        this.submitting = false;
      }
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
        name: '',
        description: '',
      };
    },
  },
};
</script>

<style scoped>
.category-manager {
  padding: 20px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.category-header h2 {
  margin: 0;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 10px;
}

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

.btn-edit {
  background: #28a745;
  color: white;
}

.btn-edit:hover:not(:disabled) {
  background: #1e7e34;
}

.btn-delete {
  background: #dc3545;
  color: white;
}

.btn-delete:hover:not(:disabled) {
  background: #bd2130;
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

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.category-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.category-content h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.category-description {
  color: #666;
  margin: 0 0 10px 0;
  font-size: 14px;
  line-height: 1.4;
}

.category-count {
  font-size: 12px;
  color: #999;
}

.category-actions {
  display: flex;
  gap: 8px;
  margin-top: 15px;
}

.no-categories {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.no-categories i {
  font-size: 48px;
  margin-bottom: 20px;
  color: #ddd;
}

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
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
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

.modal-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #999;
  padding: 5px;
}

.modal-close:hover {
  color: #333;
}

.modal-form {
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
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-group input[readonly] {
  background: #f8f9fa;
  color: #6c757d;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid #eee;
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
</style>
