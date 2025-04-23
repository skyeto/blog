import { atom, onMount } from "nanostores";
import { sessionStore, awaitSocket } from "./session_store.js";

export const chat = atom();

onMount(chat, async () => {
  let s = await awaitSocket();
  console.log("socket", s);

  chat.set(s.channel("chat:main"));
});

export async function awaitChat() {
  return new Promise((resolve) => {
    if (chat.get()) {
      return resolve(chat.get());
    }

    const unsubscribe = chat.listen((c) => {
      unsubscribe();
      resolve(c);
    });
  });
}
