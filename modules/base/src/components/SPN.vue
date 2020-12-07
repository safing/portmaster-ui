<template>
  <div class="spn ui very basic inverted segment">
    <div class="ui grid">
      <!-- Header -->
      <div class="one column centered row">
        <div class="column">
          <div class="ui very basic inverted center aligned segment spn-header">
            <h1>Safing Privacy Network</h1>
            <p>
              Protect all your connections from mass surveillance.<br />
              Prevent all Internet Service Providers from collecting and selling your private activities.
            </p>

            <h3>Currently in closed Pre-Alpha.</h3>
            <p>
              <a href="https://safing.io/spn/">
                <div class="button">
                  Learn more
                </div>
              </a>
              <a href="https://account.safing.io/pricing">
                <div class="button">
                  Pre-order SPN
                </div>
              </a>
            </p>
          </div>
        </div>
      </div>

      <!-- FAQ -->
      <div class="doubling two column row spn-faq">
        <div class="column">
          <h4>Is the SPN out yet?</h4>
          <p>
            The SPN is currently in a closed pre-alpha with our earliest Kickstarter backers (MARVIN & VISIONARY).
            To find out about current goals & its status <a href="https://github.com/safing/spn/wiki/Pre-Alpha-Goals-and-Status">visit the GitHub wiki</a>.
            You can also <a href="https://safing.io/next/">follow our progress on our next page</a>.
          </p>
        </div>
        <div class="column">
          <h4>When can I use the SPN?</h4>
          <p>There are two key factors. The most important metric is development: the faster we progress the faster you get access. From our recent experience with the Portmaster, we know it will take weeks or months until it matures enough to progress into the "alpha" stage. The second key factor is your place in the waitlist. Everyone who pre-ordered got enqueued and we will gradually let more people into the network. Feel free to pre-order too or wait until we open the network for instant access.</p>
        </div>
        <div class="column">
          <h4>Is the SPN like Tor?</h4>
          <p>
            The SPN is heavily inspired by Tor, but the mission is different. Next to tightly integrating with other
            privacy modules, the main focus of Safing and the SPN is easy protection for your whole computer, not just
            your browser. Additionally it spreads your connections across the globe instead of routing everything
            through the same circuit.
            <a href="https://safing.io/blog/2020/01/22/how-the-spn-compares-to-tor/">Read our comparison blog</a> to
            find out more.
          </p>
        </div>
        <div class="column">
          <h4>Does the SPN only protect my browser?</h4>
          <p>The SPN reroutes all your computer's connections, including those of your browser.</p>
        </div>
        <div class="column">
          <h4>Does the SPN route all connections individually? So every connection exits on a different node?</h4>
          <p>
            Yes. Every connection is routed separately, giving you a vast amount of identities (IP addresses).
            <a href="https://safing.io/assets/img/spn-labeled/spn-community.png">View this explainer image</a> showing a
            computer connecting to Steam, ProtonMail and Spotify.
          </p>
        </div>
        <div class="column">
          <h4>Does the SPN route connections on a per app basis?</h4>
          <p>
            No, it routes every connection individually. So, as an example, when you open several websites in different
            tabs in your browser, every connection will be calculated individually.
          </p>
        </div>
        <div class="column">
          <h4>Are all connections routed through the SPN?</h4>
          <p>Yes, when enabled, the Portmaster routes all Internet connections through the Safing Privacy Network.</p>
        </div>
        <div class="column">
          <h4>Do I need a kill switch?</h4>
          <p>
            No. As the Portmaster already looks after all connections, the SPN does not need a kill switch by design.
          </p>
        </div>
        <div class="column">
          <h4>
            Am I totally safe from tracking with the SPN? What do service providers see when connecting through the SPN?
          </h4>
          <p>
            No. This is just one piece of the puzzle. The SPN primarily protects your IP-address from exposure, but there are
            still many other ways services can track and identify you. These include fingerprinting (mostly in
            browsers), authentication (when logged in to a service), mouse movements (malicious javascripts), etc…
          </p>
        </div>
        <div class="column">
          <h4>Can services still identify me through other methods?</h4>
          <p>
            Yes, this is just one piece of the puzzle. There are multiple ways services track you, like browser
            fingerprinting, malicious javascripts, etc… And if you log into services, such as your Google account, they
            will mostly still know it is you, even though you protect your IP address.
          </p>
        </div>
        <div class="column">
          <h4>Can I safely log in to sites via the SPN? Like my bank account etc?</h4>
          <p>
            Yes. All serious websites use secure https connections, which encrypts the content of your connection (like
            login credentials) <em>before</em> the Portmaster wraps them in onion encryption. So no ISP architecture or
            SPN exit node will be able to manipulate that data. It is protected by https all the way to the destination
            server.
          </p>
        </div>
        <div class="column">
          <h4>Is there a free trial version for people interested in the SPN?</h4>
          <p>
            No. Providing the network costs us money, so we charge accordingly. However, the privacy filter and DNS
            Resolver, which add a great value to your privacy, are and will remain free to use.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "SPN",
  components: {},
  data() {
    return {};
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.spn {
  height: 100vh;
  overflow-y: scroll;
  padding: 2em !important;
  background: #242526 !important;
}

.spn-header {
  background: none !important;
  margin-top: 50px !important;
  h1 {
    font-size: 3rem !important;
  }
  h3 {
    margin-top: 70px !important;
  }

  .button {
    margin: 10px;
    font-family: Roboto;
    color: #fff;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    background-color: #6188ff;
    border-radius: 10rem;
    padding: 0.42rem 2.5rem 0.42rem 2.5rem;
    display: inline-block;
    align-items: center;
    transition: all 0.1s ease-in-out;

    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    .icon {
      padding-right: 0.75rem;
      font-size: 1.5rem;
    }

    .wiggle {
      animation: wiggle 0.6s infinite alternate;
    }

    @keyframes wiggle {
      0% {
        transform: rotate(4deg);
      }
      100% {
        transform: rotate(10deg);
      }
    }
  }
}
.spn-faq {
  margin-top: 20px !important;

  .column {
    padding: 2rem !important;

    p {
      color: rgb(190, 190, 190);
    }
  }
}
</style>
