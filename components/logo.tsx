import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  href?: string;
}

export function Logo({
  className = "",
  width = 180,
  height = 60,
  href,
}: LogoProps) {
  const logoElement = (
    <Image
      src="/logos/logo.png"
      alt="LumiCloud"
      width={width}
      height={height}
      className={className}
      priority
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {logoElement}
      </Link>
    );
  }

  return logoElement;
}
