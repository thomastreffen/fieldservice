import { Helmet } from "react-helmet-async";

const SITE_NAME = "FieldService";
const DEFAULT_DESCRIPTION = "Moderne field service system for varmepumpe, elektro og VVS-bedrifter. Start gratis prøveperiode i dag.";
const OG_IMAGE = "https://fieldservice.no/og-image.png";

interface SeoHeadProps {
  title: string;
  description?: string;
  ogType?: string;
  canonicalPath?: string;
}

export function SeoHead({ title, description = DEFAULT_DESCRIPTION, ogType = "website", canonicalPath }: SeoHeadProps) {
  const canonical = canonicalPath ? `https://fieldservice.no${canonicalPath}` : undefined;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonical && <meta property="og:url" content={canonical} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />

      {canonical && <link rel="canonical" href={canonical} />}
    </Helmet>
  );
}
