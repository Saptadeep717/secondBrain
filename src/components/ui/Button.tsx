import type { ReactElement } from "react";
export interface ButtonProps {
  variant: "primary" | "secondary";
  // size:"lg"|"sm"|"md";
  text: string;
  startIcon?: ReactElement; //any thing
  onClick?: () => void;
  fullWidth?: boolean;
  loading?: boolean;
}
const variantClasses = {
  primary: "bg-purple-600 text-white",
  secondary: `bg-purple-200 text-purple-600`,
};
const defaultStyles = "px-4 py-2 rounded-md font-lignt flex items-center";

export const Button = ({
  variant,
  text,
  startIcon,
  onClick,
  fullWidth,
  loading,
}: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={
        variantClasses[variant] +" " + defaultStyles +
        `${fullWidth && "w-full flex items-center"} 
         ${loading && "opacity-45"}
         `
      }
      disabled={loading}
    >
      <div className="pr-2 self-center">{startIcon}</div>
      {text}
    </button>
  );
};
