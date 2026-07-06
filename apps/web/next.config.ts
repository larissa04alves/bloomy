import "@bloomy/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  serverExternalPackages: ["libsql", "@libsql/client"],
};

export default nextConfig;
