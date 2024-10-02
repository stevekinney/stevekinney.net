---
title: Alternatives to Snapshot Tests
description: Explore alternatives to snapshot tests for efficient testing.
modified: 2024-09-28T15:26:05-06:00
---

Snapshot tests—love them or hate them. They seem *so* helpful at first. "Look, I just got this test to pass by updating the snapshot!" But then, a month later, when that snapshot has 1,200 lines of JSON and you can't even remember what you're testing? Yeah, we’ve all been there. So, if you want to avoid the trap of snapshot tests becoming a maintenance nightmare, what can you do instead? Let’s explore some real-world alternatives that’ll keep your test suite both useful and maintainable.

## Testing Individual Pieces of Output

Snapshots are super tempting because you just "capture" a component's output in one fell swoop. But nine times out of ten, you’re probably not interested in *everything* that comes out. What you **really** care about is that specific little chunk of output—a CSS class, a tag, some text.

Let’s say you have a `Button` component. Instead of snapshotting the whole thing, let's focus on the key part. For example, we might want to confirm that the button is using the right class, rendering the right label:

```js
import { render } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import Button from './Button.vue';

describe('Button', () => {
	it('renders with the right label and class', () => {
		const { getByRole } = render(Button, { props: { label: 'Click Me' } });

		const button = getByRole('button');

		// Instead of snapshotting the whole thing
		expect(button.textContent).toBe('Click Me');
		expect(button.classList).toContain('btn-primary');
	});
});
```

Boom. You’re now testing exactly what matters… and you won’t get overwhelmed with endless diffs when the padding on the button changes.

## Testing Behavior Instead of Output

Snapshots focus *heavily* on the "what" (what does the output look like?). But have you ever thought about the "how"? You don't write components just to *look* pretty; they should, you know, *do* something.

Here's where testing behavior comes in. Let’s stick with our `Button` example and imagine it has a click handler. We don’t care what the DOM looks like after rendering—we care whether it propagates a click event when a user actually clicks it.

```js
import { render, fireEvent } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import Button from './Button.vue';

describe('Button', () => {
	it('emits an event when clicked', async () => {
		const { getByRole, emitted } = render(Button, {
			props: { label: 'Click Me' },
		});

		const button = getByRole('button');

		await fireEvent.click(button);

		expect(emitted()).toHaveProperty('click');
	});
});
```

There you go—tests behavior, not the markup. If the button now has pixel margins that change, or some new obscure span element nesting, you're not going to balk at pointless diffs.

## Using Textual Assertions, Not Snapshots

For larger components that render more intricate layouts, a textual representation can be easier to reason about than raw HTML output. Textual assertions are your friend when you’re focused on user-facing content.

Let’s say we’re testing a `UserProfile` component that displays a user’s name and title. Rather than snapshotting the whole thing (and dying a slow death with every subtle layout change), you can test that the right content renders:

```js
import { render } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import UserProfile from './UserProfile.vue';

describe('UserProfile', () => {
	it("renders the user's name and title", () => {
		const { getByText } = render(UserProfile, {
			props: { user: { name: 'Jane Doe', title: 'Developer' } },
		});

		// Test user-facing text—super easy to follow and maintain
		expect(getByText('Jane Doe')).toBeTruthy();
		expect(getByText('Developer')).toBeTruthy();
	});
});
```

Next time the layout changes, no huge diff worries. You’re asserting against the only thing that actually matters to users—what they *see* and *read*.

## Custom Matchers

Sometimes, JSON snapshots sneak into the party. If you find yourself in that scenario, consider writing custom matchers to make the test more explicit. With Vitest, you can create matchers to simplify those complex assertions.

```js
expect.extend({
	toHaveTextContent(received, argument) {
		const pass = received.textContent.includes(argument);
		if (pass) {
			return {
				message: () => `expected ${received} not to have text content ${argument}`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${received} to have text content ${argument}`,
				pass: false,
			};
		}
	},
});

// In your test
expect(button).toHaveTextContent('Click Me');
```

This helps keep things readable—and avoids snapshot hell.

## When/If Snapshots Might Actually Help

I'm not telling you to delete **all** snapshots from your life. There are times when they’re pretty convenient—like tracking a huge chunk of config objects or API response mock data where you need the full picture.

But the trick is to use them **sparingly**. Focus your tests on the critical parts of your UI and interactions, and keep the snapshots for data or when the structure *really* matters.

## Final Thoughts

Snapshots can seem appealing because they look like a "set-it-and-forget-it" safety net, but too often, they turn into a "set-it-and-please-forget-this-PR-even-happened" nightmare. Stick with the alternatives: test the behavior, test specific output, and if you ever reach for a snapshot, try testing just the part that really matters. You'll thank yourself when you're not drowning in snapshot diffs on your next Friday night deploy.
