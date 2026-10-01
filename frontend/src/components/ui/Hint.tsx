import cn from "@/utils/classname-func";

interface Props {
  text: string;
  className?: string;
}

const Hint = ({ text, className }: Props) => {
  return (
    <p
      className={cn("text-xs text-muted-foreground leading-normal", className)}
    >
      {text}
    </p>
  );
};

export default Hint;
