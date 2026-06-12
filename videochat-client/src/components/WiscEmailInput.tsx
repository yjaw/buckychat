import { useRef } from "react";

interface WiscEmailInputProps {
  id: string;
  value: string;
  onChange: (netid: string) => void;
}

export function WiscEmailInput({ id, value, onChange }: WiscEmailInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="email-prefix-wrap">
      <input
        id={id}
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(normalizeNetid(e.target.value))}
        placeholder="netid"
        autoComplete="username"
        required
      />
      <span className="email-suffix">@wisc.edu</span>
    </div>
  );
}

function normalizeNetid(value: string) {
  return value.trim().replace(/@wisc\.edu$/i, "").replace(/@/g, "");
}

export function toWiscEmail(netid: string) {
  return `${netid.trim()}@wisc.edu`;
}

export function netidFromEmail(email: string) {
  return email.replace(/@wisc\.edu$/i, "");
}
