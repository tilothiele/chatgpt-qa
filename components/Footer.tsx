import { IconBrandGithub, IconBrandTwitter } from "@tabler/icons-react";
import { FC } from "react";

export const Footer: FC = () => {
  return (
    <div className="flex h-[50px] border-t border-gray-300 py-2 px-8 items-center sm:justify-between justify-center">
      <div className="hidden sm:flex"></div>

      <div className="hidden sm:flex italic text-sm">
        Erstellt von
        <a
          className="hover:opacity-50 mx-1"
          href="https://twitter.com/tilott"
          target="_blank"
          rel="noreferrer"
        >
          Tilo Thiele
        </a>
        basierend auf den Posts von
        <a
          className="hover:opacity-50 ml-1"
          href="https://www.unterwegsmitbuddha.de/"
          target="_blank"
          rel="noreferrer"
        >
          Unterwegs mit Buddha
        </a>
        und
        <a
          className="hover:opacity-50 ml-1"
          href="https://steffimania.de/"
          target="_blank"
          rel="noreferrer"
        >
          Steffimania
        </a>
        .
      </div>

      <div className="flex space-x-4">
        <a
          className="flex items-center hover:opacity-50"
          href="https://twitter.com/tilott"
          target="_blank"
          rel="noreferrer"
        >
          <IconBrandTwitter size={24} />
        </a>

        <a
          className="flex items-center hover:opacity-50"
          href="https://github.com/tilothiele"
          target="_blank"
          rel="noreferrer"
        >
          <IconBrandGithub size={24} />
        </a>
      </div>
    </div>
  );
};
