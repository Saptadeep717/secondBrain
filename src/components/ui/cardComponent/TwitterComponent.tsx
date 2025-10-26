import { useEffect } from "react";

interface TweetEmbedProps {
  link: string;
  cardClass?: string;
}

const TwitterComponent = ({ link, cardClass = "" }: TweetEmbedProps) => {
  useEffect(() => {
    // Dynamically load or refresh the Twitter widgets script
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    document.body.appendChild(script);

    // Cleanup to avoid duplicate scripts
    return () => {
      document.body.removeChild(script);
    };
  }, [link]);

  const twitterUrl = link.replace("x.com", "twitter.com"); // normalize domain

  return (
    <div className={cardClass}>
      <blockquote className="twitter-tweet">
        <a href={twitterUrl}></a>
      </blockquote>
    </div>
  );
};

export default TwitterComponent;
