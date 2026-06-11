interface LoginStoryProps {
  quote: string;
  caption: string;
  avatar: string;
  label?: string;
}

export function LoginStory({ quote, caption, avatar, label = "BuckyChat story" }: LoginStoryProps) {
  return (
    <aside className="login-story" aria-label={label}>
      <figure>
        <blockquote>{quote}</blockquote>
        <figcaption>
          <span className="login-avatar" aria-hidden="true">{avatar}</span>
          <span>{caption}</span>
        </figcaption>
      </figure>
    </aside>
  );
}
