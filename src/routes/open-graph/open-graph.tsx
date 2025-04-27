import { encode } from 'html-entities';

import satori from 'satori';
import sharp from 'sharp';

import { readFile } from 'fs/promises';

import metadata from '$lib/metadata';

const firaSansBold = await readFile('./static/fira-sans-500-normal.woff');
const firaSansThin = await readFile('./static/fira-sans-300-normal.woff');
const leagueGothic = await readFile('./static/league-gothic-400-normal.woff');

const Description = ({ description = '' }) => {
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

const OpenGraphImage = ({ title = metadata.title, description = '' }) => {
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
          padding: '4rem',
          gap: '2rem',
          backgroundImage:
            'radial-gradient(circle at 25px 25px, rgba(220, 58, 30, 0.5) 5%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(43, 141, 153, 0.5) 5%, transparent 0%), linear-gradient(to right, #F1D9AC, #A8E2E9)',
          color: 'black',
          backgroundSize: '100px 100px, 100px 100px, 100% 100%',
          backgroundColor: 'white',
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
          <Description />
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

export async function createOpenGraphImage(
  title: string = metadata.title,
  description: string | null | undefined = metadata.description,
) {
  const [mainTitle] = title
    .split(' | ')
    .map((line) => line.trim())
    .map((line) => encode(line));

  const svg = await satori(
    OpenGraphImage({
      title: mainTitle,
      description: encode(description || ''),
    }),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Fira Sans',
          weight: 300,
          style: 'normal',
          data: firaSansThin,
        },
        {
          name: 'Fira Sans',
          weight: 500,
          style: 'normal',
          data: firaSansBold,
        },
        {
          name: 'League Gothic',
          weight: 500,
          style: 'normal',
          data: leagueGothic,
        },
      ],
    },
  );

  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function h(type: string, props: { [key: string]: unknown } | null, ...children: unknown[]) {
  if (children && children.length) {
    props = props || {};
    props.children = children;
  }

  return { type, props: props || {} };
}
