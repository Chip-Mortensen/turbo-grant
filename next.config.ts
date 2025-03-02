import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Exclude Supabase Edge Functions from the Next.js build process
  webpack: (config, { isServer }) => {
    // Add the Supabase functions directory to the ignored modules
    config.externals = [...(config.externals || []), 'supabase/functions'];
    
    // Ignore Deno-specific imports
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /supabase\/functions\/.*/,
      loader: 'ignore-loader',
    });
    
    return config;
  },
};

export default nextConfig;
