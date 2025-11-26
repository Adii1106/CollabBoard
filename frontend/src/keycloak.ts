import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: "http://localhost:8080",   // your Keycloak server
  realm: "collabboard",           // your realm name
  clientId: "collabboard-frontend"
});

export default keycloak;
