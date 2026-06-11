interface LoginStoryProps {
  quote: string;
  caption: string;
  avatar: string;
  label?: string;
  wallpaper?: string;
}

export function LoginStory({ quote, caption, avatar, label = "BuckyChat story", wallpaper }: LoginStoryProps) {
  return (
    <aside
      className="login-story"
      aria-label={label}
      style={wallpaper ? { "--story-wallpaper": `url(/${wallpaper})` } as React.CSSProperties : undefined}
    >
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
