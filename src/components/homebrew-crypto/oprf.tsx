import { useState } from "react";

import { p384 } from "@noble/curves/p384";

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

export default function OPRF() {
  const [blindingFactor, setBlindingFactor] = useState(BigInt(0));
  const [clientInput, setClientInput] = useState("oprf?!");
  const [secretKey, setSecretKey] = useState(BigInt(0));
  const [log, setLog] = useState([]);

  return (
    <div className="w-full rounded bg-black/50 px-2 py-2 shadow">
      <div className="mb-2 font-mono break-all">
        (Client) Blinding Factor = <div>{blindingFactor}</div>
        <button
          className="cursor-pointer underline"
          onClick={(e) => {
            setBlindingFactor(p384.utils.randomPrivateKey());
          }}
        >
          Generate
        </button>
      </div>

      <hr className="my-4 opacity-25" />

      <div className="mb-3 font-mono break-all">
        (Client) Input =
        <div>
          <input
            type="text"
            value={clientInput}
            onChange={(e) => {
              setClientInput(e.value);
            }}
            className="w-full bg-white/5"
          />
        </div>
      </div>

      <hr className="my-4 opacity-25" />

      <div className="font-mono break-all">
        (Server) Secret Key = <div>{secretKey}</div>
        <button
          className="cursor-pointer underline"
          onClick={(e) => {
            setSecretKey(p384.utils.randomPrivateKey());
          }}
        >
          Generate
        </button>
      </div>

      <hr className="my-4 opacity-25" />

      <div classname="flex flex-row font-mono w-full">
        <button className="w-full">Compute OPRF</button>
      </div>

      <hr className="my-4 opacity-25" />

      <div class="font-mono">Log</div>
      <div class="max-h-64 w-full bg-white font-mono">{log}</div>
    </div>
  );
}

async function sha384(data) {
  const buffer = await window.crypto.subtle.digest("SHA-384", data);

  return new Uint8Array(buffer);
}
