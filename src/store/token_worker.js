/*
FriendlyCaptcha code is MIT licensed
 */
import * as blake2b from "../lib/blake2b.wasm?init";
const CHALLENGE_SIZE_BYTES = 128;
const HASH_SIZE_BYTES = 32;

let setSolver;
let solverInitialized = false;
let solver = new Promise((resolve) => (setSolver = resolve));

self.onmessage = async (event) => {
  const data = event.data;

  if (solverInitialized == false) {
    setSolver(await getWasmSolver());
    solverInitialized = true;
  }
  const solve = await solver;

  for (let b = 0; b < 256; b++) {
    data.input[123] = b;

    let [sol, hash] = solve(data.input, difficultyToThreshold(data.threshold));

    if (sol != undefined) {
      self.postMessage({
        type: "result",
        puzzleIndex: data.puzzleIndex,
        solution: sol.slice(-8),
        hash: hash,
      });
      return;
    }
  }
};

async function createWasmSolver() {
  let instance = await blake2b.default({
    env: {
      abort: () => {
        console.error("aborting blake2b");
      },
    },
  });

  const extendedExports = {};
  const exports = instance.exports;
  const memory = exports.memory;
  const alloc = exports["__alloc"];
  const retain = exports["__retain"];
  const rttiBase = exports["__rtti_base"] || ~0;

  function getInfo(id) {
    const U32 = new Uint32Array(memory.buffer);
    return U32[((rttiBase + 4) >>> 2) + id * 2];
  }

  extendedExports.__allocArray = (id, values) => {
    const info = getInfo(id);
    const align = 31 - Math.clz32((info >>> 6) & 31);
    const length = values.length;
    const buf = alloc(length << align, 0);
    const arr = alloc(12, id);
    const U32 = new Uint32Array(memory.buffer);
    U32[(arr + 0) >>> 2] = retain(buf);
    U32[(arr + 4) >>> 2] = buf;
    U32[(arr + 8) >>> 2] = length << align;
    const buffer = memory.buffer;
    const view = new Uint8Array(buffer);
    if (info & (1 << 14)) {
      for (let i = 0; i < length; ++i)
        view[(buf >>> align) + i] = retain(values[i]);
    } else {
      view.set(values, buf >>> align);
    }
    return arr;
  };
  extendedExports.__getUint8Array = (ptr) => {
    const U32 = new Uint32Array(memory.buffer);
    const bufPtr = U32[(ptr + 4) >>> 2];
    return new Uint8Array(memory.buffer, bufPtr, U32[(bufPtr - 4) >>> 2] >>> 0);
  };

  let e = await demangle(instance.exports, extendedExports);

  return { e };
}

async function getWasmSolver() {
  const w = await createWasmSolver();

  const arrPtr = w.e.__retain(
    w.e.__allocArray(w.e.Uint8Array_ID, new Uint8Array(128))
  );
  let solution = w.e.__getUint8Array(arrPtr);

  return (puzzleBuffer, threshold, n) => {
    if (n == undefined || n == null) n = 4294967295;
    solution.set(puzzleBuffer);
    const hashPtr = w.e.solveBlake2b(arrPtr, threshold, n);
    solution = w.e.__getUint8Array(arrPtr);
    const hash = w.e.__getUint8Array(hashPtr);
    w.e.__release(hashPtr);
    return [solution, hash];
  };
}

async function solve(blake2bSolver, input, threshold, n) {
  const buf = input.buffer;
  const view = new DataView(buf);
  const start = view.getUint32(124, true);
  const end = start + n;

  for (let i = start; i < end; i++) {
    view.setUint32(124, i, true);

    let result = new Uint8Array(
      await self.crypto.subtle.digest("SHA-256", view)
    );

    if (result[0] == 0 && result[1] == 0) {
      return result;
    }
  }

  console.log("fail");

  return undefined;
}

function i2hex(i) {
  return ("0" + i.toString(16)).slice(-2);
}

function demangle(exports, extendedExports) {
  extendedExports = extendedExports == undefined ? {} : extendedExports;
  const setArgumentsLength = exports["__argumentsLength"]
    ? (length) => {
        exports["__argumentsLength"].value = length;
      }
    : exports["__setArgumentsLength"] ||
      exports["__setargc"] ||
      (() => {
        return {};
      });
  for (const internalName in exports) {
    if (!Object.prototype.hasOwnProperty.call(exports, internalName)) continue;
    const elem = exports[internalName];

    const name = internalName.split(".")[0];

    if (typeof elem === "function" && elem !== setArgumentsLength) {
      (extendedExports[name] = (...args) => {
        setArgumentsLength(args.length);
        return elem(...args);
      }).original = elem;
    } else {
      extendedExports[name] = elem;
    }
  }
  return extendedExports;
}

function difficultyToThreshold(value) {
  if (value > 255) {
    value = 255;
  } else if (value < 0) {
    value = 0;
  }

  return Math.pow(2, (255.999 - value) / 8.0) >>> 0;
}
