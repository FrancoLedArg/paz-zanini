import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@paz/content"],
  redirects: async () => [{ source: "/serie/expediente", destination: "/expediente", permanent: true }],
};

export default config;
