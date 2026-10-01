import cn from "@/utils/classname-func";
import { Dot, X } from "lucide-react";
import { useState } from "react";

interface Props {
  title: string;
  className?: string;
  available?: boolean;
  deletable?: boolean;
  onClick?: () => void;
}

const Ingredient = ({
  title,
  className,
  available = false,
  deletable = false,
  onClick,
}: Props) => {
  const [mouseOn, setMouseOn] = useState(false);

  const handleMouseEnter = () => {
    setMouseOn(true);
  };

  const handleMouseLeave = () => {
    setMouseOn(false);
  };
  return (
    <span
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative px-3 py-1.5 rounded-full capitalize bg-secondary text-sm text-foreground border border-custom flex flex-row items-center",
        className,
        {
          "text-primary bg-[rgba(61,107,79,0.12)]!": available,
          "cursor-pointer": onClick ? true : false,
          "pl-2! pr-3! cursor-pointer": deletable,
        },
      )}
    >
      {deletable && !mouseOn && (
        <Dot size={16} strokeWidth={10} color="#7a6e5f" />
      )}
      {deletable && mouseOn && <X size={16} color="#7a6e5f" />}
      {title}
    </span>
  );
};

export default Ingredient;
