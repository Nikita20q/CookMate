interface FormErrorProps {
  id?: string;
  message?: string;
}

export default function FormError({ id, message }: FormErrorProps) {
  if (!message) return null;
  return <p id={id} role="alert" className="text-sm text-destructive">{message}</p>;
}
