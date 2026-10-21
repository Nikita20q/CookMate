import cn from "@/utils/classname-func";

interface Props {
  text: string;
  type?: "button" | "submit" | "reset";
  className?: string;
  variant?: "primary" | "secondary";
  onClick?: () => void;
  disabled?: boolean;
  nofocus?: boolean;
}

const Button = ({
  text,
  type = "button",
  className,
  variant = "primary",
  nofocus = false,
  disabled = false,
  onClick,
}: Props) => {
  const ReactTag = nofocus ? "div" : "button";
  return (
    <ReactTag
      {...(!nofocus ? { disabled, type } : {})}
      onClick={onClick}
      className={cn(
        "disabled:cursor-not-allowed disabled:opacity-80 transition-all hover:opacity-90 active:scale-[0.99] cursor-pointer w-full py-3.5 rounded-xl flex items-center justify-center gap-2.5",
        {
          "bg-primary text-primary-foreground": variant == "primary",
          "bg-secondary border border-custom text-foreground":
            variant == "secondary",
        },
        className,
      )}
    >
      <span className="font-medium">{text}</span>
    </ReactTag>
  );
};

export default Button;
