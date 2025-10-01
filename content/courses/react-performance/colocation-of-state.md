---
title: Colocation of State
description: >-
  Keep state near its consumers to reduce render storms, simplify data flow, and
  make components easier to reason about.
date: 2025-09-06T21:48:02.336Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - performance
  - architecture
  - state-management
---

State colocation is one of those React performance patterns that sounds fancy but is really just common sense: keep your state as close as possible to where it's actually used. Instead of hoisting everything to the top of your component tree "just in case," you put state right where it belongs—near the components that actually need it.

This simple principle can dramatically reduce unnecessary re-renders, make your components easier to test and reason about, and save you from the dreaded prop-drilling nightmare. Plus, it makes your code more maintainable when you inevitably need to move components around (and trust me, you will).

## Why Colocation Matters

When state lives far from where it's consumed, you end up with a few problems:

- **Render storms**: Changes to high-level state trigger re-renders in components that don't actually care about those changes
- **Prop drilling**: You're threading props through multiple component layers that don't need them
- **Tight coupling**: Components become dependent on parent state they shouldn't know about
- **Testing complexity**: You need to set up entire component trees just to test a small piece of functionality

React's default behavior is to re-render a component and all its children whenever state changes. If you have state at the root of your app that only affects a small part of your UI, you're potentially re-rendering your entire application for no good reason.

## The Anti-Pattern: Everything in App

Let's start with what _not_ to do. Here's a common anti-pattern where all state lives at the top level:

```tsx
// ❌ Bad: Everything lives in App
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <div>
      <Header user={user} onLogout={() => setUser(null)} />
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchResults={searchResults}
        onResultsChange={setSearchResults}
      />
      <ProductGrid
        products={searchResults}
        onProductSelect={setSelectedProduct}
        onModalOpen={() => setIsModalOpen(true)}
      />
      <Cart items={cartItems} onItemsChange={setCartItems} />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} product={selectedProduct} />
    </div>
  );
}
```

This looks organized at first glance, but every single state change triggers a re-render of the entire `App` component and all its children. When someone types in the search bar, the header, cart, and modal all re-render unnecessarily.

## Better: Colocated State

Here's the same functionality with properly colocated state:

```tsx
// ✅ Good: State lives close to where it's used
function App() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <div>
      <Header user={user} onLogout={() => setUser(null)} />
      <SearchSection />
      <Cart />
    </div>
  );
}

function SearchSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section>
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onResultsChange={setSearchResults}
      />
      <ProductGrid
        products={searchResults}
        onProductSelect={setSelectedProduct}
        onModalOpen={() => setIsModalOpen(true)}
      />
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} product={selectedProduct} />
    </section>
  );
}

function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  return <aside>{/* Cart implementation */}</aside>;
}
```

Now when someone types in the search bar, only the `SearchSection` component and its children re-render. The header and cart stay completely untouched.

## Real-World Example: Form State

Forms are a perfect example of where colocation shines. Let's look at a user profile form that demonstrates the difference:

```tsx
// ❌ Bad: Form state scattered throughout parent components
function UserProfilePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Submit logic...
    setIsSubmitting(false);
  };

  return (
    <div>
      <PageHeader />
      <UserProfileForm
        name={name}
        onNameChange={setName}
        email={email}
        onEmailChange={setEmail}
        bio={bio}
        onBioChange={setBio}
        avatar={avatar}
        onAvatarChange={setAvatar}
        isSubmitting={isSubmitting}
        errors={errors}
        onSubmit={handleSubmit}
      />
      <Sidebar />
    </div>
  );
}
```

Every keystroke in the form triggers a re-render of `UserProfilePage`, `PageHeader`, and `Sidebar`. That's wasteful.

```tsx
// ✅ Good: Form state colocated
function UserProfilePage() {
  return (
    <div>
      <PageHeader />
      <UserProfileForm />
      <Sidebar />
    </div>
  );
}

function UserProfileForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    avatar: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof typeof formData) => (value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Submit logic...
    } catch (error) {
      // Error handling...
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.name}
        onChange={(e) => updateField('name')(e.target.value)}
        placeholder="Name"
      />
      <input
        type="email"
        value={formData.email}
        onChange={(e) => updateField('email')(e.target.value)}
        placeholder="Email"
      />
      <textarea
        value={formData.bio}
        onChange={(e) => updateField('bio')(e.target.value)}
        placeholder="Bio"
      />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  );
}
```

Now form interactions only re-render the form itself. The page header and sidebar remain blissfully unaware of your typing.

## When NOT to Colocate

There are definitely times when you shouldn't colocate state. Here are the main exceptions:

### Shared State Between Siblings

When multiple components at the same level need the same state:

```tsx
// ✅ Good: Shared state lives in common parent
function Dashboard() {
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });

  return (
    <div>
      <DateRangePicker value={selectedDateRange} onChange={setSelectedDateRange} />
      <SalesChart dateRange={selectedDateRange} />
      <RevenueTable dateRange={selectedDateRange} />
    </div>
  );
}
```

### Global Application State

Some state genuinely needs to be global:

```tsx
// ✅ Good: Authentication state is global
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <ThemeProvider theme={theme}>
      <AuthProvider user={user}>
        <Router />
      </AuthProvider>
    </ThemeProvider>
  );
}
```

### State That Needs to Persist

If state needs to survive component unmounting, it probably belongs higher up:

```tsx
// ✅ Good: Draft state persists when modal closes
function App() {
  const [draftPost, setDraftPost] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsComposeOpen(true)}>Write Post</button>
      {isComposeOpen && (
        <ComposeModal
          draft={draftPost}
          onDraftChange={setDraftPost}
          onClose={() => setIsComposeOpen(false)}
        />
      )}
    </div>
  );
}
```

## Advanced Pattern: State Lifting and Lowering

Sometimes you'll need to move state up and down the component tree as requirements change. This is totally normal! Here's how to think about it:

```tsx
// Initial implementation: colocated
function ProductCard({ product }: { product: Product }) {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={() => setIsLiked(!isLiked)}>{isLiked ? '❤️' : '🤍'}</button>
    </div>
  );
}
```

Later, you need to show liked products in a different part of the app:

```tsx
// Lifted state for sharing
function ProductSection() {
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());

  const toggleLike = (productId: string) => {
    setLikedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  return (
    <div>
      <ProductGrid products={products} likedProducts={likedProducts} onToggleLike={toggleLike} />
      <LikedProductsSidebar likedProducts={likedProducts} />
    </div>
  );
}
```

> [!TIP]
> Start with colocated state and lift only when you have a concrete need to share it. Don't lift state speculatively.

## Performance Impact in Numbers

To put this in perspective, here's what happens in a typical component tree:

```tsx
// ❌ State at root causes 100+ component re-renders
function App() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div>
      <Header /> {/* Unnecessary re-render */}
      <Navigation /> {/* Unnecessary re-render */}
      <MainContent>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <ProductGrid /> {/* Unnecessary re-render */}
      </MainContent>
      <Sidebar /> {/* Unnecessary re-render */}
      <Footer /> {/* Unnecessary re-render */}
    </div>
  );
}

// ✅ Colocated state causes 3-5 component re-renders
function MainContent() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <section>
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <SearchResults query={searchQuery} />
    </section>
  );
}
```

The difference becomes exponentially more important as your component tree grows. A change that triggers 5 re-renders instead of 100 is a 95% performance improvement!

## Testing Benefits

Colocated state makes testing much simpler since you don't need to mock complex parent state:

```tsx
// ✅ Easy to test - self-contained
describe('UserProfileForm', () => {
  it('validates email format', () => {
    render(<UserProfileForm />);

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'invalid-email' },
    });

    fireEvent.click(screen.getByText('Save Profile'));

    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });
});
```

Compare this to testing the same logic when state lives in a parent component—you'd need to set up the entire component hierarchy just to test email validation.

## Quick Colocation Checklist

Before you decide where to put state, ask yourself:

- **How many components actually need this state?** If it's just one, colocate it.
- **Do sibling components need to share this state?** If yes, lift to the common parent.
- **Does this state need to persist when components unmount?** If yes, consider lifting it.
- **Is this truly global state** (like authentication or theme)? If yes, put it in a provider or global store.
- **Am I lifting state "just in case"?** Don't do this—start colocated and lift when needed.

