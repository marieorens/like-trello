import ToastNotification from '../components/ToastNotification.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

export default {
  install(Vue) {
    // Enregistrer les composants globalement
    Vue.component('ToastNotification', ToastNotification);
    Vue.component('LoadingSpinner', LoadingSpinner);

    // Créer une instance de toast globale
    const ToastConstructor = Vue.extend(ToastNotification);
    const toastInstance = new ToastConstructor();
    toastInstance.$mount();
    document.body.appendChild(toastInstance.$el);

    // Ajouter les méthodes toast à Vue.prototype
    Vue.prototype.$toast = {
      success: (message, title, duration) => toastInstance.success(message, title, duration),
      error: (message, title, duration) => toastInstance.error(message, title, duration),
      warning: (message, title, duration) => toastInstance.warning(message, title, duration),
      info: (message, title, duration) => toastInstance.info(message, title, duration),
      loading: (message, title, duration) => toastInstance.loading(message, title, duration),
      remove: id => toastInstance.removeToast(id),
    };

    // Créer une instance de loading globale
    const LoadingConstructor = Vue.extend(LoadingSpinner);
    const loadingInstance = new LoadingConstructor({
      propsData: {
        show: false,
        fullscreen: true,
        type: 'ring',
        variant: 'primary',
      },
    });
    loadingInstance.$mount();
    document.body.appendChild(loadingInstance.$el);

    // Ajouter les méthodes loading à Vue.prototype
    Vue.prototype.$loading = {
      show: (options = {}) => {
        Object.assign(loadingInstance, {
          show: true,
          title: options.title || 'Chargement...',
          message: options.message || 'Veuillez patienter',
          type: options.type || 'ring',
          variant: options.variant || 'primary',
          progress: options.progress || null,
          cancellable: options.cancellable || false,
        });
      },
      hide: () => {
        loadingInstance.show = false;
      },
      setProgress: progress => {
        loadingInstance.progress = progress;
      },
      setMessage: message => {
        loadingInstance.message = message;
      },
    };

    // Ajouter des méthodes utilitaires pour les confirmations améliorées
    Vue.prototype.$confirm = {
      delete: async (itemName = 'cet élément') => {
        const result = await Vue.prototype.$swal.fire({
          title: `Supprimer ${itemName} ?`,
          html: `
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 60px; color: #e74c3c; margin-bottom: 20px;">
                <i class="fas fa-trash-alt"></i>
              </div>
              <p style="font-size: 16px; color: #7f8c8d; margin: 0;">
                Cette action est <strong>irréversible</strong>.<br>
                Êtes-vous sûr de vouloir continuer ?
              </p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonColor: '#e74c3c',
          cancelButtonColor: '#95a5a6',
          confirmButtonText: '<i class="fas fa-trash"></i> Supprimer définitivement',
          cancelButtonText: '<i class="fas fa-times"></i> Annuler',
          reverseButtons: true,
          focusCancel: true,
          customClass: {
            popup: 'swal-delete-popup',
            confirmButton: 'swal-delete-confirm',
            cancelButton: 'swal-delete-cancel',
          },
        });
        return result.isConfirmed;
      },

      save: async (message = 'Voulez-vous sauvegarder vos modifications ?') => {
        const result = await Vue.prototype.$swal.fire({
          title: 'Sauvegarder les modifications',
          html: `
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 60px; color: #27ae60; margin-bottom: 20px;">
                <i class="fas fa-save"></i>
              </div>
              <p style="font-size: 16px; color: #7f8c8d; margin: 0;">
                ${message}
              </p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonColor: '#27ae60',
          cancelButtonColor: '#95a5a6',
          confirmButtonText: '<i class="fas fa-save"></i> Sauvegarder',
          cancelButtonText: '<i class="fas fa-times"></i> Annuler',
          reverseButtons: true,
        });
        return result.isConfirmed;
      },

      discard: async (message = 'Voulez-vous abandonner vos modifications ?') => {
        const result = await Vue.prototype.$swal.fire({
          title: 'Abandonner les modifications',
          html: `
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 60px; color: #f39c12; margin-bottom: 20px;">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <p style="font-size: 16px; color: #7f8c8d; margin: 0;">
                ${message}<br>
                <strong>Toutes vos modifications seront perdues.</strong>
              </p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonColor: '#f39c12',
          cancelButtonColor: '#95a5a6',
          confirmButtonText: '<i class="fas fa-trash"></i> Abandonner',
          cancelButtonText: '<i class="fas fa-arrow-left"></i> Continuer l\'édition',
          reverseButtons: true,
          focusCancel: true,
        });
        return result.isConfirmed;
      },
    };

    // Intercepteur global pour les erreurs
    Vue.prototype.$handleError = (error, context = 'Une erreur est survenue') => {
      console.error(`Error in ${context}:`, error);

      let message = "Une erreur inattendue s'est produite.";
      let title = 'Erreur';

      if (error.response) {
        // Erreur de réponse HTTP
        const status = error.response.status;
        const data = error.response.data;

        switch (status) {
          case 400:
            title = 'Requête invalide';
            message = data.message || 'Les données envoyées sont incorrectes.';
            break;
          case 401:
            title = 'Non autorisé';
            message = 'Vous devez vous connecter pour accéder à cette ressource.';
            break;
          case 403:
            title = 'Accès interdit';
            message = "Vous n'avez pas les permissions nécessaires.";
            break;
          case 404:
            title = 'Ressource introuvable';
            message = "L'élément demandé n'existe plus ou a été déplacé.";
            break;
          case 500:
            title = 'Erreur serveur';
            message = 'Le serveur rencontre des difficultés. Réessayez plus tard.';
            break;
          default:
            title = `Erreur ${status}`;
            message = data.message || `Une erreur ${status} s'est produite.`;
        }
      } else if (error.request) {
        // Erreur réseau
        title = 'Problème de connexion';
        message = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
      } else {
        // Autre erreur
        message = error.message || message;
      }

      Vue.prototype.$toast.error(message, title);
    };

    // Méthodes utilitaires pour l'UX
    Vue.prototype.$ux = {
      // Délai pour simuler un chargement fluide
      delay: (ms = 500) => new Promise(resolve => setTimeout(resolve, ms)),

      // Exécuter une action avec loading automatique
      withLoading: async (asyncFn, options = {}) => {
        Vue.prototype.$loading.show({
          title: options.title || 'Chargement...',
          message: options.message || 'Veuillez patienter',
          type: options.type || 'ring',
        });

        try {
          const result = await asyncFn();
          await Vue.prototype.$ux.delay(options.minDelay || 300);
          return result;
        } finally {
          Vue.prototype.$loading.hide();
        }
      },

      // Feedback de succès avec délai
      success: async (message, title = null) => {
        Vue.prototype.$toast.success(message, title);
        await Vue.prototype.$ux.delay(200);
      },
    };
  },
};
