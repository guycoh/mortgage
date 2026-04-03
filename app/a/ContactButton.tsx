type Props = {
  text: string;
  href: string;
};

export default function ContactButton({ text, href }: Props) {
  return (
    <a
      href={href}
      className="block w-full py-3 rounded-xl bg-white text-blue-600 font-medium text-sm hover:bg-gray-100 active:scale-95 transition-all"
    >
      {text}
    </a>
  );
}