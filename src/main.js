import Vue from 'vue';
import App from './App.vue';
import router from './router';
import pinia from './store';

import './assets/styles/_main.scss';
import './plugins/sweetAlert';
import NotificationPlugin from './plugins/notifications';

Vue.use(NotificationPlugin);
Vue.use(pinia);

Vue.config.productionTip = false;

new Vue({
  router,
  pinia,
  render: h => h(App),
}).$mount('#app');
