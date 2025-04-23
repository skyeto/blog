import { atom, onMount } from "nanostores";
import { Socket } from "phoenix";
import { accessTokens } from "./access_token.js";
import { API_HOST } from "@/config.js";

export const socket = atom();

onMount(socket, () => {
  let token = accessTokens.get();
  let s = new Socket(API_HOST + "/socket");

  s.connect();
  socket.set(s);
  let radioChannel = s
    .channel("radio:status", {})
    .join()
    .receive("ok", (resp) => {
      console.log("receiving radio status messages", resp);
    })
    .receive("error", (resp) => {
      console.log("failed to join radio status channel");
    });
});
