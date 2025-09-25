<template>
  <div class="board-view view">
    <h1 class="display-3 text-uppercase text-center">Vos tableaux</h1>

    <main>
      <div class="board" v-for="(board, index) in boards" :key="index">
        <div class="board-title">
          <h3>
            {{ board.title }}
          </h3>

          <div>
            <button @click="addTask(board.name)">
              <i class="fas fa-plus"></i>
            </button>

            <button @click="deleteCategory(board.id)" class="btn-delete">
              <i class="fas fa-trash"></i>
            </button>

            <button @click="editCategory(board.id)" class="btn-edit-category">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </div>

        <Container
          group-name="trello"
          class="drag-container"
          @drag-start="handleDragStart(board.name, $event)"
          @drop="handleDrop(board.name, $event)"
          :get-child-payload="getChildPayload"
          :drop-placeholder="{ className: 'drop-placeholder' }"
          drag-class="task-ghost"
          drop-class="task-ghost-drop"
        >
          <Draggable v-for="(task, index) in board.tasks" :key="index">
            <div class="task">
              <h3>{{ task.text }}</h3>
              <button @click="deleteTask(board.name, index)">
                <i class="fas fa-trash"></i>
              </button>
              <button @click="editTask(board.name, index)" class="btn-edit-task">
                <i class="fas fa-edit"></i>
              </button>
            </div>
          </Draggable>
        </Container>
      </div>
    </main>

    <button class="btn-create-category" @click="createCategory">
      <i class="fas fa-plus"></i> Nouvelle Catégorie
    </button>
  </div>
</template>

<script>
import { Container, Draggable } from 'vue-smooth-dnd';
import { useBoardStore } from '../store/boardStore';
import { storeToRefs } from 'pinia';
import Swal from 'sweetalert2';
import wordpressAPI from '../services/wordpressApi';
import { ref } from 'vue';

export default {
  components: {
    Container,
    Draggable,
  },
  setup() {
    const boardStore = useBoardStore();
    boardStore.loadCategories();
    const { boards } = storeToRefs(boardStore);

    const createCategory = async () => {
      const { value: categoryName } = await Swal.fire({
        title: 'Nom de la nouvelle catégorie',
        input: 'text',
        inputPlaceholder: 'Nom de la catégorie',
        showCancelButton: true,
        confirmButtonText: 'Créer',
        cancelButtonText: 'Annuler',
        inputValidator: value => {
          if (!value) return 'Vous devez donner un nom à la catégorie';
        },
      });
      if (categoryName) {
        const response = await wordpressAPI.createCategory({ name: categoryName });
        if (response.success) {
          await boardStore.loadCategories();
          Swal.fire(
            'Succès',
            `La catégorie "${categoryName}" a été créée avec succès !`,
            'success'
          );
        } else {
          Swal.fire(
            'Erreur',
            response.error.message || 'Erreur lors de la création de la catégorie',
            'error'
          );
        }
      }
    };

    const editCategory = async categoryId => {
      const category = boards.value.find(board => board.id === categoryId);
      if (!category) return;
      const { value: newTitle } = await Swal.fire({
        title: 'Modifier le nom de la catégorie',
        input: 'text',
        inputValue: category.title,
        showCancelButton: true,
        confirmButtonText: 'Modifier',
        cancelButtonText: 'Annuler',
        inputValidator: value => {
          if (!value) return 'Le nom de la catégorie est obligatoire';
        },
      });
      if (newTitle) {
        const response = await wordpressAPI.updateCategory(categoryId, {
          title: newTitle,
          name: category.name,
        });
        if (response.success) {
          await boardStore.loadCategories();
          Swal.fire('Succès', 'Nom de la catégorie modifié avec succès', 'success');
        } else {
          Swal.fire(
            'Erreur',
            response.error.message || 'Erreur lors de la modification du nom de la catégorie',
            'error'
          );
        }
      }
    };

    const deleteCategory = async categoryId => {
      const category = boards.value.find(board => board.id === categoryId);
      if (!category) return;
      const confirmation = await Swal.fire({
        title: 'Êtes-vous sûr ?',
        text: `Voulez-vous vraiment supprimer la catégorie "${category.title}" ?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Oui, supprimer',
        cancelButtonText: 'Annuler',
      });
      if (confirmation.isConfirmed) {
        const response = await wordpressAPI.deleteCategory(categoryId);
        if (response.success) {
          await boardStore.loadCategories();
          Swal.fire(
            'Succès',
            'Catégorie supprimée avec succès',
            'success'
          );
        } else {
          Swal.fire(
            'Erreur',
            response.error.message || 'Erreur lors de la suppression de la catégorie',
            'error'
          );
        }
      }
    };

    const addTask = async boardName => {
      const category = boards.value.find(board => board.name === boardName);
      if (!category) {
        Swal.fire('Erreur', 'Catégorie introuvable', 'error');
        return;
      }
      const { value: formValues } = await Swal.fire({
        title: 'Créer une tâche',
        html:
          `<input id="task-title" class="swal2-input" placeholder="Titre">` +
          `<textarea id="task-content" class="swal2-textarea" placeholder="Description"></textarea>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Créer',
        cancelButtonText: 'Annuler',
        preConfirm: () => {
          const title = document.getElementById('task-title').value;
          const content = document.getElementById('task-content').value;
          if (!title) {
            Swal.showValidationMessage('Le titre est obligatoire');
          }
          return { title, content };
        },
      });
      if (formValues) {
        const response = await wordpressAPI.createTask({
          title: formValues.title,
          content: formValues.content,
          categoryId: category.id,
        });
        if (response.success) {
          await boardStore.loadCategories();
          Swal.fire(
            'Succès',
            'Tâche créée avec succès',
            'success'
          );
        } else {
          Swal.fire(
            'Erreur',
            response.error.message || 'Erreur lors de la création de la tâche',
            'error'
          );
        }
      }
    };

    const editTask = async (boardName, taskIndex) => {
      const category = boards.value.find(board => board.name === boardName);
      if (!category) {
        Swal.fire('Erreur', 'Catégorie introuvable', 'error');
        return;
      }
      const task = category.tasks[taskIndex];
      const { value: formValues } = await Swal.fire({
        title: 'Modifier la tâche',
        html:
          `<input id="task-title" class="swal2-input" placeholder="Titre" value="${task.text}">` +
          `<textarea id="task-content" class="swal2-textarea" placeholder="Description">${task.content || ''}</textarea>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Modifier',
        cancelButtonText: 'Annuler',
        preConfirm: () => {
          const title = document.getElementById('task-title').value;
          const content = document.getElementById('task-content').value;
          if (!title) {
            Swal.showValidationMessage('Le titre est obligatoire');
          }
          return { title, content };
        },
      });
      if (formValues) {
        const response = await wordpressAPI.updateTask(task.id, {
          title: formValues.title,
          content: formValues.content,
        });
        if (response.success) {
          await boardStore.loadCategories();
          Swal.fire(
            'Succès',
            'Tâche modifiée avec succès',
            'success'
          );
        } else {
          Swal.fire(
            'Erreur',
            response.error.message || 'Erreur lors de la modification de la tâche',
            'error'
          );
        }
      }
    };

    const deleteTask = async (boardName, taskIndex) => {
      const category = boards.value.find(board => board.name === boardName);
      if (!category) {
        Swal.fire('Erreur', 'Catégorie introuvable', 'error');
        return;
      }
      const task = category.tasks[taskIndex];
      const confirmation = await Swal.fire({
        title: 'Êtes-vous sûr ?',
        text: `Voulez-vous vraiment supprimer la tâche "${task.text}" ?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Oui, supprimer',
        cancelButtonText: 'Annuler',
      });
      if (confirmation.isConfirmed) {
        const response = await wordpressAPI.deleteTask(task.id);
        if (response.success) {
          await boardStore.loadCategories();
          Swal.fire(
            'Succès',
            'Tâche supprimée avec succès',
            'success'
          );
        } else {
          Swal.fire(
            'Erreur',
            response.error.message || 'Erreur lors de la suppression de la tâche',
            'error'
          );
        }
      }
    };

    const dragSourceLane = ref(null);

    const handleDragStart = lane => {
      dragSourceLane.value = lane;
    };

    const handleDrop = (lane, dropResult) => {
      if (!dropResult || (dropResult.removedIndex == null && dropResult.addedIndex == null)) return;
      const sourceCategory = boards.value.find(board => board.name === dragSourceLane.value);
      const targetCategory = boards.value.find(board => board.name === lane);
      if (!sourceCategory || !targetCategory) return;
      let movedTask = null;
      if (dropResult.removedIndex != null) {
        movedTask = sourceCategory.tasks.splice(dropResult.removedIndex, 1)[0];
      }
      if (dropResult.addedIndex != null && movedTask) {
        targetCategory.tasks.splice(dropResult.addedIndex, 0, movedTask);
      } else if (movedTask) {
        sourceCategory.tasks.splice(dropResult.removedIndex, 0, movedTask);
      }
      dragSourceLane.value = null;
    };

    const getChildPayload = index => {
      return { index };
    };

    return {
      boards,
      createCategory,
      editCategory,
      deleteCategory,
      addTask,
      editTask,
      deleteTask,
      getChildPayload,
      handleDragStart,
      handleDrop,
    };
  },
};
</script>

<style>
.btn-create-category {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: #3498db;
  color: white;
  border: none;
  padding: 15px 20px;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.btn-create-category:hover {
  background-color: #2980b9;
  transform: scale(1.1);
}

.board-view .btn-delete {
  color: white;
  margin-left: 10px;
  background-color: red;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.board-view .btn-delete:hover {
  background-color: darkred;
}

.btn-edit-category {
  margin-left: 10px;
  background-color: #f39c12;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-edit-category:hover {
  background-color: #e67e22;
}

.btn-edit-task {
  margin-left: 10px;
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-edit-task:hover {
  background-color: #27ae60;
}
</style>
