import axios from 'axios';

class WordPressAPI {
  constructor(baseURL = 'http://localhost/wordpress', username = null, password = null) {
    this.baseURL = baseURL;
    this.apiURL = `${baseURL}/wp-json/wp/v2`;

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (username && password) {
      const credentials = btoa(`${username}:${password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }

    this.client = axios.create({
      baseURL: this.apiURL,
      timeout: 10000,
      headers: headers,
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    this.client.interceptors.request.use(
      config => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        console.error('[API] Erreur de requête:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      response => {
        console.log(`[API] Réponse reçue:`, response.status);
        return response;
      },
      error => {
        console.error('[API] Erreur de réponse:', error.response?.status, error.message);
        return Promise.reject(this.handleError(error));
      }
    );
  }

  handleError(error) {
    const errorData = {
      message: 'Erreur de connexion à WordPress',
      status: null,
      details: null,
    };

    if (error.response) {
      errorData.status = error.response.status;
      errorData.details = error.response.data;

      switch (error.response.status) {
        case 400:
          errorData.message = 'Requête invalide';
          break;
        case 401:
          errorData.message = 'Non autorisé';
          break;
        case 403:
          errorData.message = 'Accès interdit';
          break;
        case 404:
          errorData.message = 'Ressource non trouvée';
          break;
        case 500:
          errorData.message = 'Erreur serveur WordPress';
          break;
        default:
          errorData.message = `Erreur HTTP ${error.response.status}`;
      }
    } else if (error.request) {
      errorData.message = "WordPress inaccessible. Vérifiez votre connexion et l'URL WordPress.";
    }

    return errorData;
  }

  async testConnection() {
    try {
      const response = await this.client.get('/');
      return {
        success: true,
        message: 'Connexion WordPress OK',
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error,
      };
    }
  }

  async getCategories() {
    try {
      const response = await this.client.get('/categories?per_page=100');
      return {
        success: true,
        data: response.data.map(cat => ({
          id: cat.id,
          name: cat.slug,
          title: cat.name,
          description: cat.description,
          count: cat.count,
        })),
      };
    } catch (error) {
      return { success: false, error };
    }
  }

  async createCategory(categoryData) {
    try {
      const response = await this.client.post('/categories', {
        name: categoryData.name,
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          name: response.data.slug,
          title: response.data.name,
          description: response.data.description,
          count: 0,
        },
      };
    } catch (error) {
      return { success: false, error };
    }
  }

  async updateCategory(categoryId, categoryData) {
    try {
      const response = await this.client.put(`/categories/${categoryId}`, {
        name: categoryData.title,
        slug: categoryData.name,
        description: categoryData.description || '',
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          name: response.data.slug,
          title: response.data.name,
          description: response.data.description,
        },
      };
    } catch (error) {
      return { success: false, error };
    }
  }

  async deleteCategory(categoryId) {
    try {
      await this.client.delete(`/categories/${categoryId}?force=true`);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  async getCategory(categoryId) {
    try {
      const response = await this.client.get(`/categories/${categoryId}`);
      const cat = response.data;
      return {
        success: true,
        data: {
          id: cat.id,
          name: cat.slug,
          title: cat.name,
          description: cat.description,
          count: cat.count,
        },
      };
    } catch (error) {
      return { success: false, error };
    }
  }

  async getPosts(categoryId = null) {
    try {
      let url = '/posts?per_page=100';
      if (categoryId) {
        url += `&categories=${categoryId}`;
      }

      const response = await this.client.get(url);

      console.log('getPosts response:', response.data);

      return {
        success: true,
        data: response.data.map(post => ({
          id: post.id,
          title: post.title.rendered,
          content: post.content.rendered,
          excerpt: post.excerpt.rendered,
          categoryId: post.categories[0] || null,
          date: post.date,
          modified: post.modified,
          status: post.status,
          slug: post.slug,
          meta: post.meta,
        })),
      };
    } catch (error) {
      console.error('getPosts error:', error);
      return { success: false, error };
    }
  }

  /**
   * Récupère un article spécifique
   */
  async getPost(postId) {
    try {
      const response = await this.client.get(`/posts/${postId}`);
      const post = response.data;

      return {
        success: true,
        data: {
          id: post.id,
          title: post.title.rendered,
          content: post.content.rendered,
          excerpt: post.excerpt.rendered,
          categoryId: post.categories[0] || null,
          date: post.date,
          modified: post.modified,
          status: post.status,
          slug: post.slug,
        },
      };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Crée un nouvel article
   */
  async createPost(postData) {
    try {
      const requestData = {
        title: postData.title,
        content: postData.content || '',
        excerpt: postData.excerpt || '',
        categories: postData.categoryId ? [postData.categoryId] : [],
        status: postData.status || 'publish',
      };

      requestData.meta = {
        ...postData.meta,
        task_status: postData.meta?.task_status || 'todo',
      };

      console.log('createPost requestData:', JSON.stringify(requestData, null, 2));

      const response = await this.client.post('/posts', requestData);
      const post = response.data;

      console.log('createPost response:', JSON.stringify(post, null, 2)); // Detailed log

      return {
        success: true,
        data: {
          id: post.id,
          title: post.title.rendered,
          content: post.content.rendered,
          meta: post.meta,
        },
      };
    } catch (error) {
      console.error('createPost error:', error);
      console.error('createPost error details:', error.response?.data || error.message);
      return { success: false, error };
    }
  }

  async updatePost(postId, postData) {
    try {
      const updateData = {};

      if (postData.title !== undefined) updateData.title = postData.title;
      if (postData.content !== undefined) updateData.content = postData.content;
      if (postData.excerpt !== undefined) updateData.excerpt = postData.excerpt;
      if (postData.categoryId !== undefined) updateData.categories = [postData.categoryId];
      if (postData.status !== undefined) updateData.status = postData.status;
      if (postData.meta !== undefined) updateData.meta = postData.meta;

      console.log('updatePost requestData:', JSON.stringify(updateData, null, 2)); // Debugging log

      const response = await this.client.put(`/posts/${postId}`, updateData);
      const post = response.data;

      console.log('updatePost response:', JSON.stringify(post, null, 2)); // Debugging log

      return {
        success: true,
        data: {
          id: post.id,
          title: post.title.rendered,
          content: post.content.rendered,
          categoryId: post.categories[0] || null,
          modified: post.modified,
        },
      };
    } catch (error) {
      console.error('updatePost error:', error);
      console.error('updatePost error details:', error.response?.data || error.message); // Log error details
      return { success: false, error };
    }
  }
  async deletePost(postId) {
    try {
      await this.client.delete(`/posts/${postId}?force=true`);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }
  async getComments(postId) {
    try {
      const response = await this.client.get(`/comments?post=${postId}&per_page=100`);
      return {
        success: true,
        data: response.data.map(comment => ({
          id: comment.id,
          postId: comment.post,
          author: comment.author_name,
          content: comment.content.rendered,
          date: comment.date,
          status: comment.status,
        })),
      };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Crée un nouveau commentaire
   */
  async createComment(postId, commentData) {
    try {
      const response = await this.client.post('/comments', {
        post: postId,
        content: commentData.content,
        author_name: commentData.author || 'Utilisateur',
        author_email: commentData.email || 'user@example.com',
      });

      const comment = response.data;
      return {
        success: true,
        data: {
          id: comment.id,
          postId: comment.post,
          author: comment.author_name,
          content: comment.content.rendered,
          date: comment.date,
        },
      };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Supprime un commentaire
   */
  async deleteComment(commentId) {
    try {
      await this.client.delete(`/comments/${commentId}?force=true`);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  // ================================
  // MÉTHODES UTILITAIRES
  // ================================

  /**
   * Change l'URL WordPress
   */
  setWordPressURL(newURL) {
    this.baseURL = newURL;
    this.apiURL = `${newURL}/wp-json/wp/v2`;
    this.client.defaults.baseURL = this.apiURL;

    console.log(`[API] URL WordPress changée: ${this.apiURL}`);
  }

  /**
   * Récupère les informations sur l'API WordPress
   */
  async getAPIInfo() {
    try {
      const response = await axios.get(`${this.baseURL}/wp-json`);
      return {
        success: true,
        data: {
          namespace: response.data.namespaces,
          routes: Object.keys(response.data.routes),
          authentication: response.data.authentication,
        },
      };
    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }

  async testAxiosInstance() {
    try {
      const response = await this.client.get('/posts');
      console.log('Axios instance test response:', response.data);
    } catch (error) {
      console.error('Axios instance test error:', error);
    }
  }

  async createTask(taskData) {
    try {
      const response = await this.client.post('/posts', {
        title: taskData.title,
        content: taskData.content,
        categories: [taskData.categoryId],
        status: 'publish',
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          title: response.data.title.rendered,
          content: response.data.content.rendered,
          categoryId: taskData.categoryId,
        },
      };
    } catch (error) {
      return { success: false, error };
    }
  }

  async updateTask(taskId, taskData) {
    try {
      const response = await this.client.put(`/posts/${taskId}`, {
        title: taskData.title,
        content: taskData.content,
        categories: taskData.categoryId ? [taskData.categoryId] : undefined,
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          title: response.data.title.rendered,
          content: response.data.content.rendered,
          categoryId: response.data.categories[0],
        },
      };
    } catch (error) {
      return { success: false, error };
    }
  }

  async getTasksByCategory(categoryId) {
    try {
      const response = await this.client.get(`/posts?categories=${categoryId}`);
      const tasks = response.data.map(task => ({
        id: task.id,
        title: task.title.rendered, // Extraction du titre rendu
        content: task.content.rendered.replace(/<[^>]*>/g, ''), // Suppression des balises HTML
      }));
      return { success: true, data: tasks };
    } catch (error) {
      console.error('Erreur lors de la récupération des tâches:', error);
      return { success: false, error };
    }
  }

  async deleteTask(taskId) {
    try {
      const response = await this.client.delete(`/posts/${taskId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erreur lors de la suppression de la tâche:', error);
      return { success: false, error };
    }
  }
}

const WP_USERNAME = process.env.VUE_APP_WP_USERNAME || 'admin';
const WP_PASSWORD = process.env.VUE_APP_WP_PASSWORD || 'your-app-password-here';

const wordpressAPI = new WordPressAPI('http://localhost/wordpress', WP_USERNAME, WP_PASSWORD);

export default wordpressAPI;
