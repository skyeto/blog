import { useState, useRef, useEffect } from "react";

import { p384, hashToCurve } from "@noble/curves/p384";
import { invert } from "@noble/curves/abstract/modular";
import { bytesToNumberBE, bytesToHex } from "@noble/curves/utils";
import { clsx } from "clsx";

const p384c = {
  p: BigInt(
    "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000ffffffff"
  ),
  n: BigInt(
    "0xffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973"
  ),
  h: BigInt(1),
  a: BigInt(
    "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000fffffffc"
  ),
  b: BigInt(
    "0xb3312fa7e23ee7e4988e056be3f82d19181d9c6efe8141120314088f5013875ac656398d8a2ed19d2a85c8edd3ec2aef"
  ),
  Gx: BigInt(
    "0xaa87ca22be8b05378eb1c71ef320ad746e1d3b628ba79b9859f741e082542a385502f25dbf55296c3a545e3872760ab7"
  ),
  Gy: BigInt(
    "0x3617de4a96262c6f5d9e98bf9292dc29f8f41dbd289a147ce9da3113b5f0b8c00a60b1ce1d7e819d7a431d7c90ea0e5f"
  ),
};

function blindOPRF(blindingFactor, input) {
  const inputBytes = new TextEncoder().encode(input);

  console.log(inputBytes);
  // Hash input to a point on P-384
  const m = hashToCurve(inputBytes, { DST: "OPRF-P384-SHA384-v1" });

  // Calc inverse to the client blinding scalar
  const blindingFactorInv = invert(
    bytesToNumberBE(blindingFactor),
    p384.CURVE.n
  );

  // Blind the point
  const blindedPoint = m.multiply(blindingFactorInv);
  console.log("test1", m);
  const unblindTest = blindedPoint.multiply(bytesToNumberBE(blindingFactor));
  console.log("test2", unblindTest);
  console.log("same point?", unblindTest.equals(m));

  return blindedPoint;
}

async function unblindOPRF(blindingFactor, evaluatedPoint) {
  const unblindedPoint = evaluatedPoint.multiply(
    bytesToNumberBE(blindingFactor)
  );

  const hash = await crypto.subtle.digest(
    "SHA-384",
    unblindedPoint.toRawBytes()
  );

  return bytesToHex(new Uint8Array(hash));
}

function evaluateBlindOPRF(serverKey, blindedPoint) {
  // Evaluate (multiply) blinded point with server key
  const evaluatedPoint = blindedPoint.multiply(bytesToNumberBE(serverKey));

  return evaluatedPoint;
}

let id = 0;
export default function OPRF() {
  const [blindingFactor, setBlindingFactor] = useState<BigInt>(BigInt(0));
  const [blindedPoint, setBlindedPoint] = useState();
  const [evaluatedPoint, setEvaluatedPoint] = useState();
  const [clientInput, setClientInput] = useState("oprf?! (you can change me!)");
  const [secretKey, setSecretKey] = useState<BigInt>(BigInt(0));
  const [log, setLog] = useState([]);
  const [prevHash, setPrevHash] = useState("");
  const logRef = useRef();

  useEffect(() => {
    if (!logRef.current) return;

    logRef.current.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "instant",
    });
  }, [log, logRef]);

  useEffect(() => {
    setBlindingFactor(p384.utils.randomPrivateKey());
    setSecretKey(p384.utils.randomPrivateKey());
    writeLog("info", "set initial keys");
  }, []);

  const writeLog = (type, message, extra) => {
    setLog((prevLog) => [
      ...prevLog,
      {
        id: id++,
        type: type,
        message: message,
        extra: extra ? extra : "",
      },
    ]);
  };

  const simulateOPRF = async () => {
    const delay = async (delay) => {
      return await new Promise((resolve, reject) => {
        setTimeout(
          () => {
            resolve();
          },
          delay ? delay : 1000
        );
      });
    };

    writeLog("info", "--- Running OPRF protocol ---");
    await delay(100);

    const blinded = blindOPRF(blindingFactor, clientInput);
    console.log("Blinded point: ", blinded);
    setBlindedPoint(blinded);
    writeLog("client", `blinded point (cI * inv(cBf) = Bp)`);
    writeLog("client", "sending Bp to server for evaluation");

    await delay(500);
    const evaluated = evaluateBlindOPRF(secretKey, blinded);
    console.log("[Server] Evaluated point: ", evaluated);
    writeLog("server", `evaluated Bp (Bp * sSk = eBp)`);
    setEvaluatedPoint(evaluated);

    await delay(500);
    writeLog("client", "received eBp from server");
    const unblind = await unblindOPRF(blindingFactor, evaluated);
    console.log("[Client] Unblinded point hash: ", unblind);
    writeLog("client", `unblinded eBp (eBp * cBf = eI)`);
    writeLog("client", `OPRF hash / sha384(eI): ${unblind}`);

    if (prevHash != "") {
      if (prevHash == unblind) {
        writeLog("client", "hashes match between runs!", {
          class: "!bg-green-300/50 font-bold",
        });
      } else {
        writeLog("client", "hash did not match, did you change the input?", {
          class: "!bg-red-300/50 font-bold",
        });
      }
    } else {
      writeLog("client", "no previous hash to compare to, evaluate again", {
        class: "!bg-zinc-300/50 font-bold",
      });
    }
    setPrevHash(unblind);
  };

  return (
    <div className="w-full rounded bg-black/50 px-2 py-2 text-sm shadow">
      <div className="mb-2 font-mono break-all">
        <div className="font-bold">(Client) Blinding Factor</div>
        cBf = <div>{blindingFactor}</div>
      </div>

      <hr className="my-4 opacity-25" />

      <div className="mb-3 font-mono break-all">
        <div className="font-bold">(Client) Input</div>
        cI =
        <div>
          <input
            type="text"
            value={clientInput}
            onChange={(e) => {
              setClientInput(e.target.value);
            }}
            className="w-full bg-white/5"
          />
        </div>
      </div>

      <hr className="my-4 opacity-25" />

      <div className="font-mono break-all">
        <div className="font-bold">(Server) Secret Key</div>
        sSk = <div>{secretKey}</div>
      </div>

      <hr className="my-4 opacity-25" />

      <div className="font-mono text-sm">Generate Keys:</div>
      <div className="mb-4 flex w-full flex-row font-mono text-sm">
        <button
          className="w-full cursor-pointer underline"
          onClick={(e) => {
            setBlindingFactor(p384.utils.randomPrivateKey());
            writeLog("client", "cBf updated");
          }}
        >
          New Blinding Factor
        </button>

        <button
          className="w-full cursor-pointer underline"
          onClick={(e) => {
            setSecretKey(p384.utils.randomPrivateKey());
            writeLog("server", "sSk updated");
          }}
        >
          New Server Key
        </button>
      </div>

      <div className="font-mono text-sm">Compute:</div>
      <div className="flex w-full flex-row font-mono text-sm">
        <button
          className="w-full cursor-pointer underline"
          onClick={() => {
            simulateOPRF();
          }}
        >
          Evaluate
        </button>
      </div>

      <div className="mt-4 font-mono text-sm">
        Tip! Try computing the OPRF with different blinding factors but the same
        input!
      </div>

      <hr className="my-4 opacity-25" />

      <div className="font-mono">Log</div>
      <div
        className="max-h-48 w-full overflow-x-scroll rounded-xs bg-white/5 font-mono text-xs break-all"
        ref={logRef}
      >
        {log.map((v) => {
          return (
            <div
              className={clsx(
                {
                  "bg-amber-300/50": v.type == "server",
                  "bg-purple-300/50": v.type == "client",
                  "bg-blue-300/50": v.type == "info",
                },
                v.extra.class,
                "px-1"
              )}
              key={v.id}
            >
              <span>
                [{v.type}/{v.id}] {v.message}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function sha384(data) {
  const buffer = await window.crypto.subtle.digest("SHA-384", data);

  return new Uint8Array(buffer);
}
