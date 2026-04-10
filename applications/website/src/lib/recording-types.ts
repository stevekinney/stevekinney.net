export type Testimonial = {
  content: string;
  person: string;
};

export type Recording = {
  title: string;
  slug: string;
  description: string;
  href: string;
  duration?: string;
  topics?: string[];
  testimonial?: Testimonial[];
};
