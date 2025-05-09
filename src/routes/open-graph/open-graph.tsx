import metadata from '$lib/metadata';

/**
 * Types for the OpenGraph image components
 */
type OpenGraphImageProps = {
  title?: string;
  description?: string | null;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  secondaryAccentColor?: string;
  hideFooter?: boolean;
  handle?: string;
  url?: string;
};

type DescriptionProps = {
  description?: string | null;
  textColor?: string;
  backgroundColor?: string;
};

type HeadingProps = {
  title: string;
  description?: string | null;
  textColor?: string;
  backgroundColor?: string;
};

type FooterProps = {
  handle?: string;
  url?: string;
  backgroundColor?: string;
  textColor?: string;
};

// Default theme styling
const DEFAULT_STYLES = {
  backgroundColor: 'white',
  backgroundImage:
    'radial-gradient(circle at 25px 25px, rgba(220, 58, 30, 0.5) 5%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(43, 141, 153, 0.5) 5%, transparent 0%), linear-gradient(to right, #F1D9AC, #A8E2E9)',
  backgroundSize: '100px 100px, 100px 100px, 100% 100%',
  padding: '4rem',
  textColor: 'black',
  headingBackgroundColor: 'black',
  headingTextColor: 'white',
  accentBackgroundColor: 'white',
};

/**
 * Description component that displays the description text if provided
 */
const Description = ({
  description = '',
  textColor = 'white',
  backgroundColor = 'black',
}: DescriptionProps) => {
  if (!description) return null;

  return (
    <p
      style={{
        fontSize: '2rem',
        margin: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        backgroundColor,
        color: textColor,
        padding: '1rem 1rem',
        borderRadius: '0.25rem',
      }}
    >
      {description}
    </p>
  );
};

/**
 * Heading component for the title
 */
const Heading = ({
  title,
  description,
  textColor = 'white',
  backgroundColor = 'black',
}: HeadingProps) => {
  return (
    <h2
      style={{
        fontSize: description ? '2.5rem' : '6rem',
        textAlign: description ? 'left' : 'center',
        margin: 0,
        fontWeight: 500,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        backgroundColor,
        color: textColor,
        padding: '1rem 1rem',
        borderRadius: '0.25rem',
        lineHeight: 1.2,
      }}
    >
      {title}
    </h2>
  );
};

/**
 * Footer component with attribution and URL
 */
const Footer = ({
  handle = '@stevekinney',
  url = metadata.url,
  backgroundColor = 'white',
  textColor = 'black',
}: FooterProps) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <p
        style={{
          fontSize: '2rem',
          margin: 0,
          backgroundColor,
          color: textColor,
          padding: '1rem',
          borderRadius: '0.25rem',
        }}
      >
        {handle}
      </p>
      <p
        style={{
          fontSize: '2rem',
          margin: 0,
          backgroundColor,
          color: textColor,
          padding: '1rem',
          borderRadius: '0.25rem',
        }}
      >
        {url}
      </p>
    </div>
  );
};

/**
 * Main OpenGraphImage component for generating social media preview images
 */
export const OpenGraphImage = ({
  title = metadata.title,
  description = '',
  backgroundColor,
  textColor = DEFAULT_STYLES.textColor,
  accentColor,
  secondaryAccentColor,
  hideFooter = false,
  handle,
  url,
}: OpenGraphImageProps) => {
  // Extract the first part of the title before any dividers
  const [mainTitle] = (title || '').split(' | ').map((part) => part.trim());

  // Build the background style with overrides if provided
  const backgroundStyle = {
    ...DEFAULT_STYLES,
    backgroundColor: backgroundColor || DEFAULT_STYLES.backgroundColor,
    backgroundImage:
      accentColor || secondaryAccentColor
        ? `radial-gradient(circle at 25px 25px, ${accentColor || 'rgba(220, 58, 30, 0.5)'} 5%, transparent 0%), 
         radial-gradient(circle at 75px 75px, ${secondaryAccentColor || 'rgba(43, 141, 153, 0.5)'} 5%, transparent 0%), 
         linear-gradient(to right, #F1D9AC, #A8E2E9)`
        : DEFAULT_STYLES.backgroundImage,
  };

  return (
    <div style={{ display: 'flex' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100vw',
          height: '100vh',
          gap: '2rem',
          ...backgroundStyle,
          color: textColor,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: title ? 'flex-start' : 'center',
            gap: '2rem',
            flexGrow: 1,
            height: '60vh',
          }}
        >
          <Heading title={mainTitle || metadata.title} description={description} />
          <Description description={description} />
        </div>

        {!hideFooter && <Footer handle={handle} url={url} />}
      </div>
    </div>
  );
};

/**
 * Required helper function for JSX rendering with satori
 * This function is used by satori to create the virtual DOM elements
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function h(type: string, props: Record<string, unknown> | null, ...children: unknown[]) {
  if (children && children.length) {
    props = props || {};
    props.children = children;
  }

  return { type, props: props || {} };
}
