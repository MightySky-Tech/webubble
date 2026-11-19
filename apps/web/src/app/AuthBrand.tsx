import Image from "next/image";
import Link from "next/link";

export default function AuthBrand() {
  return (
    <Link className="wb-auth-brand" href="/" aria-label="Webubble home">
      <Image className="wb-auth-brand__image" src="/webubble_logo.jpg" alt="" width={48} height={48} priority />
      webubble
    </Link>
  );
}
