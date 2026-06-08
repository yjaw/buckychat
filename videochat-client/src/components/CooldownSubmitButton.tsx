import type { ButtonHTMLAttributes, ReactNode } from "react";

type CooldownSubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  cooldownLabel: (seconds: number) => ReactNode;
  cooldownSeconds: number;
  cooldownTotalSeconds: number;
  loading?: boolean;
  loadingLabel: ReactNode;
};

export function CooldownSubmitButton({
  children,
  className,
  cooldownLabel,
  cooldownSeconds,
  cooldownTotalSeconds,
  disabled,
  loading = false,
  loadingLabel,
  type = "submit",
  ...buttonProps
}: CooldownSubmitButtonProps) {
  const coolingDown = cooldownSeconds > 0;
  const progress =
    coolingDown && cooldownTotalSeconds > 0
      ? ((cooldownTotalSeconds - cooldownSeconds) / cooldownTotalSeconds) * 100
      : 0;
  const label = loading ? loadingLabel : coolingDown ? cooldownLabel(cooldownSeconds) : children;

  return (
    <button
      {...buttonProps}
      className={["login-submit", "cooldown-submit", coolingDown ? "cooldown-submit-active" : "", className]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || loading || coolingDown}
      type={type}
    >
      {coolingDown && (
        <span
          className="cooldown-submit-progress"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      )}
      <span className="cooldown-submit-label">{label}</span>
    </button>
  );
}
