import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 화면은 전부 클라이언트 상태라 캐시 컴포넌트는 쓰지 않는다
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
