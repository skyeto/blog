import { atom, onMount, onSet, task } from "nanostores";
import GroupWorker from "./group_worker.js?worker";
import init, * as kagippjs from "../lib/ppjs/kagippjs.js";
import { API_HOST } from "@/config.js";

export const accessTokens = atom();

const LOW_TOKEN_THRESHOLD = 10;
let CURRENTLY_FETCHING = false; // Very crude mutex

onSet(accessTokens, ({ newValue }) => {
  if (newValue) {
    if (newValue.length < LOW_TOKEN_THRESHOLD) {
      refillTokens();
    }

    localStorage.setItem("privacy_pass_tokens", JSON.stringify(newValue));
  }
});

onMount(accessTokens, () => {
  let storedTokens = localStorage.getItem("privacy_pass_tokens");

  try {
    if (storedTokens && JSON.parse(storedTokens).length > 0) {
      accessTokens.set(JSON.parse(storedTokens));
      return;
    }
  } catch (e) {
    console.warn("Stored tokens invalid?");
  }

  task(async () => {
    let tokens = await createTokens();
    accessTokens.set(tokens);
  });
});

export async function awaitTokens() {
  return new Promise((resolve) => {
    if (accessTokens.get()) {
      return resolve(accessTokens.get());
    }

    const unsubscribe = accessTokens.listen((tokens) => {
      unsubscribe();
      resolve(tokens);
    });
  });
}

export async function getToken() {
  let tokens = await awaitTokens();

  let token = tokens.pop();

  accessTokens.set(tokens);
  return token;
}

async function refillTokens() {
  if (CURRENTLY_FETCHING) return;

  CURRENTLY_FETCHING = true;
  console.debug("Refilling tokens");
  let tokens = await createTokens();
  let oldTokens = await awaitTokens();

  tokens = tokens.concat(oldTokens);
  accessTokens.set(tokens);
  CURRENTLY_FETCHING = false;
}

async function createTokens() {
  let challenge = await fetch(API_HOST + "/api/token-challenge");
  challenge = JSON.parse(await challenge.text());

  let solutionsPromise = solvePuzzle(challenge.powChallenge);
  let tokenRequestPromise = new Promise(async (resolve, reject) => {
    const res = ppTokenRequest(challenge.ppChallenge);
    resolve(res);
  });

  let t0 = Date.now();
  let solutions = await solutionsPromise;
  let { token_request, client_state_s, tokReq } = await tokenRequestPromise;
  let t1 = Date.now();
  console.log(
    `Getting PrivacyPass token request took (incl. proof of work) ~${t1 - t0}ms`
  );

  const tokReqResp = await fetch(API_HOST + "/api/token-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ppTokenRequest: token_request,
      powSolution: solutions,
    }),
  });
  const tokReqRespText = JSON.parse(await tokReqResp.text());

  t0 = Date.now();
  let tokens = await kagippjs.token_finalization(
    JSON.stringify({ header: challenge.ppChallenge, error: "" }),
    client_state_s,
    JSON.stringify({ token_response: tokReqRespText.token, error: "" })
  );
  tokens = JSON.parse(tokens);
  t1 = Date.now();
  console.log(`Generating PrivacyPass tokens took ${t1 - t0}ms`);

  return tokens.tokens;
}

const NUMBER_OFFSET = 14;
const DIFF_OFFSET = 15;
const EXPRY_OFFSET = 13;

function decodeChallenge(challenge) {
  const parts = challenge.split(".");
  const puzzle = parts[1];
  const sig = parts[0];
  const arr = base64Decode(puzzle);

  return {
    signature: sig,
    base64: puzzle,
    buffer: arr,
    n: arr[NUMBER_OFFSET],
    threshold: arr[DIFF_OFFSET],
    expiry: arr[EXPRY_OFFSET] * 30000,
  };
}

function createPuzzleInputs(puzzleBuf, num) {
  const startingPoints = [];

  for (let i = 0; i < num; i++) {
    const input = new Uint8Array(128);
    input.set(puzzleBuf);
    input[120] = i;
    startingPoints.push(input);
  }

  return startingPoints;
}

function base64Encode(arrayBuf) {
  let bytes = new Uint8Array(arrayBuf),
    i,
    len = bytes.length,
    base64 = "";

  for (i = 0; i < len; i += 3) {
    base64 += chars[bytes[i] >> 2];
    base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    base64 += chars[bytes[i + 2] & 63];
  }

  if (len % 3 === 2) {
    base64 = base64.substring(0, base64.length - 1) + "=";
  } else if (len % 3 === 1) {
    base64 = base64.substring(0, base64.length - 2) + "==";
  }

  return base64;
}

const chars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const lookup = new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}
function base64Decode(base64) {
  let bufferLength = base64.length * 0.75,
    len = base64.length,
    i,
    p = 0,
    encoded1,
    encoded2,
    encoded3,
    encoded4;

  if (base64[base64.length - 1] === "=") {
    bufferLength--;
    if (base64[base64.length - 2] === "=") {
      bufferLength--;
    }
  }

  const bytes = new Uint8Array(bufferLength);

  for (i = 0; i < len; i += 4) {
    encoded1 = lookup[base64.charCodeAt(i)];
    encoded2 = lookup[base64.charCodeAt(i + 1)];
    encoded3 = lookup[base64.charCodeAt(i + 2)];
    encoded4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return bytes;
}

async function solvePuzzle(puzzle) {
  let challDecoded = decodeChallenge(puzzle);

  const solverInputs = createPuzzleInputs(challDecoded.buffer, challDecoded.n);
  const solutionBuffer = new Uint8Array(8 * challDecoded.n);

  const worker = new GroupWorker();
  const workerPromise = new Promise((resolve, reject) => {
    worker.onmessage = (event) => {
      if (event.data.status == "done") resolve(event.data.results);
    };
    worker.postMessage({
      solverInputs: solverInputs,
      solutionBuffer: solutionBuffer,
      threshold: challDecoded.threshold,
    });
  });

  let t0 = Date.now();
  let sol = await workerPromise;
  let t1 = Date.now();
  const powSolution = `${challDecoded.signature}.${challDecoded.base64}.${base64Encode(sol)}.${"meowdyPow"}`;

  console.log(`Proof of Work completed in ${t1 - t0}ms`);

  return powSolution;
}

async function ppTokenRequest(challenge) {
  await init();
  const tokReq_s = kagippjs.token_request(
    JSON.stringify({ header: challenge, error: "" }),
    50
  );
  const tokReq = JSON.parse(tokReq_s);
  const client_state_s = JSON.stringify(tokReq[0]);
  const token_request = tokReq[1]["token_request"];

  return { tokReq, client_state_s, token_request };
}
