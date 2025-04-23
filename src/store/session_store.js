import { atom, map, listenKeys, onMount } from "nanostores";
import { accessTokens, getToken } from "./access_token.js";
import { Socket } from "phoenix";
import { API_HOST } from "@/config.js";

export const sessionStore = map({
  token: null,
  socket: null,
});

onMount(sessionStore, () => {
  console.debug("Initializing session store");
  initialize();
});

export async function initialize() {
  const privacyPass = await getToken();

  const sessionTokenResp = await fetch(API_HOST + "/api/token-exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: privacyPass,
    }),
  });
  const sessionToken = JSON.parse(await sessionTokenResp.text());

  if (sessionToken.valid != "valid") return;

  let s = new Socket(API_HOST + "/socket", {
    params: { token: sessionToken.session_token },
  });
  s.connect();
  sessionStore.setKey("socket", s);
  sessionStore.setKey("token", sessionToken.session_token);
}

export function awaitSocket() {
  return new Promise((resolve) => {
    if (sessionStore.get().socket) {
      return resolve(sessionStore.get().socket);
    }

    const unsubscribe = listenKeys(sessionStore, ["socket"], (val) => {
      if (val) {
        unsubscribe();
        resolve(val.socket);
      }
    });
  });
}
