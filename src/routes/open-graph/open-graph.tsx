import metadata from '$lib/metadata';

/**
 * Props for the OpenGraphImage component
 */
type OpenGraphImageProps = {
  title?: string;
  description?: string | null | undefined;
};

// Styling constants
const STYLES = {
  backgroundColor: 'white',
  backgroundImage:
    'radial-gradient(circle at 25px 25px, rgba(220, 58, 30, 0.5) 5%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(43, 141, 153, 0.5) 5%, transparent 0%), linear-gradient(to right, #F1D9AC, #A8E2E9)',
  backgroundSize: '100px 100px, 100px 100px, 100% 100%',
  padding: '4rem',
};

/**
 * Description component that displays the description text if provided
 */
const Description = ({ description = '' }: Pick<OpenGraphImageProps, 'description'>) => {
  if (!description) return null;
  return (
    <p
      style={{
        fontSize: '2rem',
        margin: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        backgroundColor: 'black',
        color: 'white',
        padding: '1rem 1rem',
      }}
    >
      {description}
    </p>
  );
};

/**
 * OpenGraphImage component for generating social media preview images
 */
export const OpenGraphImage = ({
  title = metadata.title,
  description = '',
}: OpenGraphImageProps) => {
  return (
    <div
      style={{
        display: 'flex',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100vw',
          height: '100vh',
          gap: '2rem',
          ...STYLES,
          color: 'black',
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
          <h2
            style={{
              fontSize: description ? '2.5rem' : '6rem',
              textAlign: description ? 'left' : 'center',
              margin: 0,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              backgroundColor: 'black',
              color: 'white',
              padding: '1rem 1rem',
            }}
          >
            {title}
          </h2>
          <Description description={description} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <p
            style={{
              fontSize: '2rem',
              margin: 0,
              backgroundColor: 'white',
              padding: '1rem',
            }}
          >
            @stevekinney
          </p>
          <p
            style={{
              fontSize: '2rem',
              margin: 0,
              backgroundColor: 'white',
              padding: '1rem',
            }}
          >
            {metadata.url}
          </p>
        </div>
      </div>
    </div>
  );
};

// Required for JSX rendering with satori
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function h(type: string, props: { [key: string]: unknown } | null, ...children: unknown[]) {
  if (children && children.length) {
    props = props || {};
    props.children = children;
  }

  return { type, props: props || {} };
}
