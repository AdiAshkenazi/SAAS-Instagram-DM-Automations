import Image from "next/image";

export const LogoSmall = () => {
  return (
    <Image
      src="/Insta flo-logo.png"
      alt="Insta Flo"
      width={360}
      height={120}
      className="object-contain"
    />
  );
};
