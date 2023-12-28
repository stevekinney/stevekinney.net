export const h = (elementType: string, props: Record<string, unknown>, ...children: unknown[]) => {
	return {
		type: elementType,
		props: {
			...props,
			children
		}
	};
};

type SocialCardProps = {
	post: Post;
	request: Request;
};

export default ({ post }: SocialCardProps) => {
	return (
		<div
			style={{
				alignItems: 'center',
				backgroundColor: '#00DBDE',
				backgroundImage: 'linear-gradient(90deg, #00DBDE 0%, #FC00FF 100%)',
				color: 'white',
				display: 'flex',
				flexDirection: 'column',
				gap: '2rem',
				height: '100vh',
				justifyContent: 'center',
				padding: '2rem',
				width: '100vw',
				textShadow: '0 0 10px rgba(0, 0, 0, 0.3)'
			}}
		>
			<h1
				style={{
					fontSize: '4rem',
					width: '100%'
				}}
			>
				{post.title}
			</h1>
			<p style={{ fontSize: '2rem' }}>{post.description}</p>
		</div>
	);
};
