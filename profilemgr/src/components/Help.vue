<template>
  <div class="help-content">
    <h1>Profiles</h1>

    <p>
      There are 4 different profiles:

      <ul>
        <li>User Profiles</li>
        <li>The Global Profile</li>
        <li>Stamp Profiles</li>
        <li>The Fallback Profile</li>
      </ul>

      Every application (every binary on the filesystem) automatically gets a User Profile.<br>
      In addition to that, Portmaster will try to fetch a community build profile (not quite yet) for that executable: the Stamp Profile<br>
      When making decisions, the Portmaster merges these four profiles together and draws preferences from this set. The order of precedence is the same as shown in the list above.
    </p>

    <h1>Security Level</h1>

    <p>
      Profiles may define a security level. All security level preference will then correctly be set to the according settings for this profile.<br>
      This enables users to define if an application requires additional security precautions.
    </p>

    <h1>Flags</h1>

    

    <h1>Endpoints</h1>

  </div>
</template>

<script>
export default {
  name: "Help",
};
</script>

<style scoped lang="scss">
.help-content {
  padding: 50px !important;
}
</style>
