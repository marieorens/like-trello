<template>
  <header class="header">
    <h2 class="logo" @click="$router.push('/')">
      <span class="text-orange">Vue</span><span class="font-weight-light">Trello</span>
    </h2>

    <nav>
      <router-link tag="a" to="/">
        <i class="fas fa-home"></i>
        Acceuil
      </router-link>
    </nav>
  </header>
</template>

<script>
export default {};
</script>

<style></style>
