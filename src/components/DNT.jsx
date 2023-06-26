import { useState } from 'react';

export default function DND(props) {
  const [consent, setConsent] = useState(false);

  if(navigator && navigator.doNotTrack == "1" && !consent) {
    return (
      <div style={{
        background: "rgb(40, 40, 40)",
        border: "1px solid rgb(60, 60, 60)",
        padding: "0.5rem",
        borderRadius: "0.25rem"
      }}>
      You have do not track enabled. Do you still want to show the remote content{props.source && <span> from {props.source}</span>}? <button style={{textDecoration: "underline"}} onClick={(e) => setConsent(true)}>Show</button>
      </div>
    )
  }

  return (
    <div>{props.children}</div>
  )
}
